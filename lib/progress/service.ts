// Server-only progress logic: learner identity, record updates, the coach
// tool token and the history handed to the prompt. Sample-grade controls:
// these are not production authentication or abuse protection.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getLesson, getLessons, isLessonId, isPracticeLanguage, type LessonId, type PracticeLanguage } from '../lessons';
import {
  MAX_CORRECTIONS, MAX_SESSIONS, MAX_TEXT,
  type CorrectionRecord, type LearnerRecord, type ProgressStore, type SessionRecord,
} from './types';
import type { ProgressView } from './view';

export const LEARNER_COOKIE = 'coach_learner';
export const LEARNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// 30 unambiguous characters (no 0/O, 1/I/L, U). Ten characters carry about
// 49 bits, so guessing a valid code through the rate-limited redeem route is
// impractical. The code is still a bearer secret: anyone who has it can read
// and change that learner's progress.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 10;

export function createLearner(now = new Date()): LearnerRecord {
  const code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const timestamp = now.toISOString();
  return {
    id: randomBytes(18).toString('base64url'),
    code,
    createdAt: timestamp,
    updatedAt: timestamp,
    languages: {},
    sessions: [],
    corrections: [],
  };
}

/** Accepts what a person types (lowercase, spaces, hyphens). Null when it cannot be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 40) return null;
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return code.length === CODE_LENGTH && [...code].every((character) => CODE_ALPHABET.includes(character)) ? code : null;
}

export function formatCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export async function findLearnerByCode(store: ProgressStore, code: string): Promise<LearnerRecord | null> {
  const record = await store.findByCode(code);
  return record && safeEqual(record.code, code) ? record : null;
}

const LEARNER_ID = /^[A-Za-z0-9_-]{20,40}$/;

export async function loadLearner(store: ProgressStore, id: string | undefined): Promise<LearnerRecord | null> {
  return id && LEARNER_ID.test(id) ? store.get(id) : null;
}

function lessonEntry(record: LearnerRecord, language: PracticeLanguage, lessonId: LessonId, at: string) {
  const languageProgress = (record.languages[language] ??= { lastLessonId: lessonId, lessons: {} });
  languageProgress.lastLessonId = lessonId;
  record.lastLanguage = language;
  record.updatedAt = at;
  return (languageProgress.lessons[lessonId] ??= { startedAt: at, lastPracticedAt: at, sessions: 0 });
}

/** A session was started for this lesson. */
export function applyStart(record: LearnerRecord, language: PracticeLanguage, lessonId: LessonId, now = new Date()) {
  lessonEntry(record, language, lessonId, now.toISOString()).lastPracticedAt = now.toISOString();
}

export type SessionInput = { id: string; language: PracticeLanguage; lessonId: LessonId; startedAt: string; endedAt: string; learnerTurns: number };

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));

/** Validates an untrusted session report. Returns null when any field is unusable. */
export function parseSession(input: unknown): SessionInput | null {
  const value = input as Partial<SessionInput> | null;
  if (!value || typeof value !== 'object') return null;
  if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(value.id)) return null;
  if (!isPracticeLanguage(value.language) || !isLessonId(value.lessonId)) return null;
  if (!isIsoDate(value.startedAt) || !isIsoDate(value.endedAt)) return null;
  if (Date.parse(value.endedAt) < Date.parse(value.startedAt)) return null;
  if (!Number.isInteger(value.learnerTurns) || value.learnerTurns! < 0 || value.learnerTurns! > 1000) return null;
  return {
    id: value.id, language: value.language, lessonId: value.lessonId,
    startedAt: new Date(value.startedAt).toISOString(), endedAt: new Date(value.endedAt).toISOString(),
    learnerTurns: value.learnerTurns!,
  };
}

/** Records a finished session once; a retried report with the same id changes nothing. */
export function applySession(record: LearnerRecord, session: SessionInput) {
  if (record.sessions.some(({ id }) => id === session.id)) return;
  const lesson = lessonEntry(record, session.language, session.lessonId, session.endedAt);
  lesson.sessions += 1;
  lesson.lastPracticedAt = session.endedAt;
  record.sessions = [...record.sessions, session satisfies SessionRecord].slice(-MAX_SESSIONS);
}

export function applyCompletion(
  record: LearnerRecord, language: PracticeLanguage, lessonId: LessonId,
  completed: boolean, by: 'learner' | 'coach', now = new Date(),
) {
  const lesson = lessonEntry(record, language, lessonId, now.toISOString());
  if (completed) {
    lesson.completedAt ??= now.toISOString();
    lesson.completedBy ??= by;
  } else {
    delete lesson.completedAt;
    delete lesson.completedBy;
  }
}

const clip = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, MAX_TEXT) : null;
};

/** Coach tool mode only. Returns false when the tool arguments are unusable. */
export function applyCorrection(
  record: LearnerRecord, language: PracticeLanguage, lessonId: LessonId,
  input: { learner_phrase?: unknown; alternative?: unknown; note?: unknown }, now = new Date(),
): boolean {
  const learnerPhrase = clip(input.learner_phrase);
  const alternative = clip(input.alternative);
  if (!learnerPhrase || !alternative) return false;
  const correction: CorrectionRecord = {
    language, lessonId, recordedAt: now.toISOString(), learnerPhrase, alternative, note: clip(input.note) ?? '',
  };
  record.corrections = [...record.corrections, correction].slice(-MAX_CORRECTIONS);
  record.updatedAt = now.toISOString();
  return true;
}

export function toView(record: LearnerRecord | null, mode: ProgressView['mode']): ProgressView {
  return {
    mode,
    saved: record !== null,
    code: record ? formatCode(record.code) : null,
    lastLanguage: record?.lastLanguage ?? null,
    languages: record?.languages ?? {},
    corrections: record?.corrections.slice(-5) ?? [],
  };
}

/** Short, factual history for the prompt. Null when nothing was saved for this language. */
export function getLearnerHistory(record: LearnerRecord | null, language: PracticeLanguage, lessonId: LessonId): string | null {
  const progress = record?.languages[language];
  if (!record || !progress) return null;
  const lessons = getLessons(language);
  const completed = lessons.filter(({ id }) => progress.lessons[id]?.completedAt).map(({ title }) => title);
  const practiced = lessons.filter(({ id }) => progress.lessons[id] && !progress.lessons[id].completedAt).map(({ title }) => title);
  const lastSession = record.sessions.filter((session) => session.language === language).at(-1);
  const current = progress.lessons[lessonId];
  const corrections = record.corrections.filter((correction) => correction.language === language).slice(-3);
  const lines = [
    `Lessons marked complete: ${completed.length ? completed.join('; ') : 'none'}.`,
    `Lessons practiced but not marked complete: ${practiced.length ? practiced.join('; ') : 'none'}.`,
    lastSession
      ? `Last finished session: ${lastSession.endedAt.slice(0, 10)}, lesson "${getLesson(language, lastSession.lessonId as LessonId).title}", ${lastSession.learnerTurns} learner turns.`
      : 'No finished session is on record.',
    `Today's lesson "${getLesson(language, lessonId).title}": ${
      current?.completedAt ? 'marked complete before; this is review'
        : current?.sessions ? `practiced ${current.sessions} time(s) before, not marked complete`
        : current ? 'started before, with no finished session on record' : 'not practiced before'
    }.`,
    ...corrections.map((correction) =>
      `Earlier recorded correction: learner said ${JSON.stringify(correction.learnerPhrase)}; suggested ${JSON.stringify(correction.alternative)}${correction.note ? ` (${correction.note})` : ''}.`),
  ];
  return lines.join('\n');
}

// --- Coach tool mode -------------------------------------------------------

/**
 * Public base URL Agora's cloud can reach (a hosted deployment or a tunnel
 * such as ngrok). Unset means browser-reported progress and no tools.
 */
export function getCoachToolBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.COACH_TOOL_BASE_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('COACH_TOOL_BASE_URL must be a full URL such as https://example.ngrok.app');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('COACH_TOOL_BASE_URL must use http or https');
  return url.origin + url.pathname.replace(/\/+$/, '');
}

export type ToolClaims = { learnerId: string; language: PracticeLanguage; lessonId: LessonId; expiresAt: number };

// Derived from the server-only App Certificate so tool mode needs no extra secret.
const toolKey = (env: NodeJS.ProcessEnv) => {
  const certificate = env.NEXT_AGORA_APP_CERTIFICATE;
  if (!certificate) throw new Error('Missing required environment variable: NEXT_AGORA_APP_CERTIFICATE');
  return createHmac('sha256', certificate).update('coach-progress-tool-v1').digest();
};

/** Per-session bearer token for the tool endpoint, bound to learner, lesson and expiry. */
export function signToolToken(claims: ToolClaims, env: NodeJS.ProcessEnv = process.env): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${createHmac('sha256', toolKey(env)).update(payload).digest('base64url')}`;
}

export function verifyToolToken(token: unknown, env: NodeJS.ProcessEnv = process.env, now = Date.now()): ToolClaims | null {
  if (typeof token !== 'string' || token.length > 1000) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  if (!safeEqual(signature, createHmac('sha256', toolKey(env)).update(payload).digest('base64url'))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ToolClaims;
    if (typeof claims.learnerId !== 'string' || !isPracticeLanguage(claims.language) || !isLessonId(claims.lessonId)) return null;
    return typeof claims.expiresAt === 'number' && claims.expiresAt > now ? claims : null;
  } catch {
    return null;
  }
}

// --- Rate limiting ---------------------------------------------------------

/**
 * Fixed-window, in-memory limiter. It is per server process, so it slows
 * guessing on one instance; it is not distributed abuse protection.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()): boolean => {
    if (hits.size > 5000) for (const [entry, value] of hits) if (value.resetAt <= now) hits.delete(entry);
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  };
}
