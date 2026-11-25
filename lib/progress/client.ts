'use client';

// Browser-side progress: an optimistic local copy that reconciles with the
// server. The last known progress is cached so the landing page can render it
// before the network answers. The learner code is never cached.
import { useEffect, useSyncExternalStore } from 'react';
import type { LessonId, PracticeLanguage } from '../lessons';
import { EMPTY_PROGRESS, withCompletion, withSession, type ProgressView } from './view';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type ProgressState = {
  view: ProgressView;
  save: SaveState;
  /** Shown inline when a save failed. The optimistic view stays, flagged as unsaved. */
  error: string | null;
};

export type SessionReport = {
  id: string;
  language: PracticeLanguage;
  lessonId: LessonId;
  startedAt: string;
  endedAt: string;
  learnerTurns: number;
};

const CACHE_KEY = 'coach-progress-v1';
const INITIAL: ProgressState = { view: EMPTY_PROGRESS, save: 'idle', error: null };

let state = INITIAL;
let loading: Promise<void> | null = null;
let retryLast: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<ProgressState>) {
  state = { ...state, ...patch };
  if (patch.view) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...patch.view, code: null }));
    } catch {
      // Private mode or a full quota: progress still works without the cache.
    }
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

async function readView(response: Response): Promise<ProgressView> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body.saved !== 'boolean') {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Progress could not be saved');
  }
  return body as ProgressView;
}

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(readView);

/** Fetches the server copy. Failure keeps whatever is shown and is not an error state. */
export async function refreshProgress(): Promise<void> {
  try {
    set({ view: await send('/api/progress', 'GET') });
  } catch {
    // Offline or store unavailable: keep the cached view.
  }
}

function load(): Promise<void> {
  return (loading ??= (async () => {
    try {
      const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached && typeof cached.saved === 'boolean') set({ view: { ...EMPTY_PROGRESS, ...cached, code: null } });
    } catch {
      // Ignore an unreadable cache.
    }
    await refreshProgress();
  })());
}

/** Applies `optimistic` now, then saves. A failure keeps the change visible with a retry. */
async function save(optimistic: ((view: ProgressView) => ProgressView) | null, request: () => Promise<ProgressView>) {
  const attempt = async () => {
    set({ save: 'saving', error: null });
    try {
      set({ view: await request(), save: 'saved' });
      retryLast = null;
    } catch (error) {
      retryLast = attempt;
      set({ save: 'error', error: error instanceof Error ? error.message : 'Progress could not be saved' });
    }
  };
  if (optimistic) set({ view: optimistic(state.view) });
  await attempt();
}

export const progressActions = {
  refresh: refreshProgress,
  reportSession: (session: SessionReport) =>
    save((view) => withSession(view, session), () => send('/api/progress', 'POST', { action: 'session', session })),
  setCompleted: (language: PracticeLanguage, lessonId: LessonId, completed: boolean) =>
    save(
      (view) => withCompletion(view, language, lessonId, completed),
      () => send('/api/progress', 'POST', { action: 'complete', language, lessonId, completed }),
    ),
  /** Creates the learner on the server if needed so a code can be shown. */
  ensureCode: () => save(null, () => send('/api/progress', 'POST', { action: 'code' })),
  retry: () => retryLast?.() ?? Promise.resolve(),
  /** Not optimistic: the browser only switches learner once the server accepts the code. */
  async redeem(code: string): Promise<string | null> {
    try {
      set({ view: await send('/api/progress/code', 'POST', { code }), save: 'idle', error: null });
      retryLast = null;
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'That code could not be used';
    }
  },
  async reset(): Promise<string | null> {
    try {
      set({ view: await send('/api/progress', 'DELETE'), save: 'idle', error: null });
      retryLast = null;
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Progress could not be reset';
    }
  },
};

/** Loading progress never starts a session or asks for the microphone. */
export function useProgress() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  useEffect(() => { void load(); }, []);
  return snapshot;
}
