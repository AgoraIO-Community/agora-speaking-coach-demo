// Browser-safe progress shapes and helpers. No server-only imports here.
import { getLessons, isLessonId, isPracticeLanguage, type LessonId, type PracticeLanguage } from '../lessons';
import type { CorrectionRecord, LanguageProgress } from './types';

/** What the browser is allowed to see. The learner id never leaves the cookie. */
export type ProgressView = {
  /** `coach` when the coach records results through tools; otherwise the browser reports sessions. */
  mode: 'browser' | 'coach';
  /** True once something has been saved for this browser. */
  saved: boolean;
  /** Learner code for moving to another device. Null until something is saved. */
  code: string | null;
  lastLanguage: string | null;
  languages: Record<string, LanguageProgress>;
  corrections: CorrectionRecord[];
};

export const EMPTY_PROGRESS: ProgressView = {
  mode: 'browser', saved: false, code: null, lastLanguage: null, languages: {}, corrections: [],
};

export type LessonState = 'not-started' | 'practiced' | 'completed';

export function getLessonState(view: ProgressView, language: PracticeLanguage, lessonId: LessonId): LessonState {
  const lesson = view.languages[language]?.lessons[lessonId];
  if (!lesson) return 'not-started';
  return lesson.completedAt ? 'completed' : 'practiced';
}

export function countCompleted(view: ProgressView, language: PracticeLanguage): number {
  return getLessons(language).filter((lesson) => getLessonState(view, language, lesson.id) === 'completed').length;
}

/**
 * Where to pick up: the last practiced language and its first lesson that is
 * not completed (the last lesson when all are). Null without saved practice.
 */
export function getContinueTarget(view: ProgressView): { language: PracticeLanguage; lessonId: LessonId } | null {
  const language = view.lastLanguage;
  if (!isPracticeLanguage(language) || !view.languages[language]) return null;
  const lessons = getLessons(language);
  const next = lessons.find((lesson) => getLessonState(view, language, lesson.id) !== 'completed');
  const lessonId = next?.id ?? view.languages[language].lastLessonId;
  return { language, lessonId: isLessonId(lessonId) ? lessonId : lessons[0].id };
}

// --- Optimistic updates ------------------------------------------------------
// The browser applies these immediately and then replaces the result with the
// server's answer. They mirror the server rules in service.ts.

function withLesson(view: ProgressView, language: PracticeLanguage, lessonId: LessonId, at: string) {
  const current = view.languages[language];
  const lesson = current?.lessons[lessonId] ?? { startedAt: at, lastPracticedAt: at, sessions: 0 };
  return {
    lesson,
    build: (next: typeof lesson): ProgressView => ({
      ...view,
      saved: true,
      lastLanguage: language,
      languages: {
        ...view.languages,
        [language]: { lastLessonId: lessonId, lessons: { ...current?.lessons, [lessonId]: next } },
      },
    }),
  };
}

export function withSession(
  view: ProgressView,
  session: { language: PracticeLanguage; lessonId: LessonId; endedAt: string },
): ProgressView {
  const { lesson, build } = withLesson(view, session.language, session.lessonId, session.endedAt);
  return build({ ...lesson, sessions: lesson.sessions + 1, lastPracticedAt: session.endedAt });
}

export function withCompletion(
  view: ProgressView, language: PracticeLanguage, lessonId: LessonId, completed: boolean,
): ProgressView {
  const at = new Date().toISOString();
  const { lesson, build } = withLesson(view, language, lessonId, at);
  const rest = { startedAt: lesson.startedAt, lastPracticedAt: lesson.lastPracticedAt, sessions: lesson.sessions };
  return build(completed
    ? { ...rest, completedAt: lesson.completedAt ?? at, completedBy: lesson.completedBy ?? 'learner' }
    : rest);
}
