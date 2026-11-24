// Saved practice history. This is a record of what was practiced, not a
// proficiency assessment: nothing here scores or grades the learner.

export type LessonProgress = {
  startedAt: string;
  lastPracticedAt: string;
  sessions: number;
  /** Set when the learner marked the lesson complete or the coach recorded the objective as met. */
  completedAt?: string;
  completedBy?: 'learner' | 'coach';
};

export type LanguageProgress = {
  lastLessonId: string;
  lessons: Record<string, LessonProgress>;
};

export type SessionRecord = {
  id: string;
  language: string;
  lessonId: string;
  startedAt: string;
  endedAt: string;
  learnerTurns: number;
};

/** Recorded only in coach tool mode. Text is recognized speech, not audio. */
export type CorrectionRecord = {
  language: string;
  lessonId: string;
  recordedAt: string;
  learnerPhrase: string;
  alternative: string;
  note: string;
};

export type LearnerRecord = {
  /** Random identifier held in an httpOnly cookie. Treat as a secret. */
  id: string;
  /** Short code the learner can type on another device. Treat as a secret. */
  code: string;
  createdAt: string;
  updatedAt: string;
  lastLanguage?: string;
  languages: Record<string, LanguageProgress>;
  sessions: SessionRecord[];
  corrections: CorrectionRecord[];
};

/**
 * Storage adapter contract. Records are small documents keyed by learner id;
 * adapters only need get/put/delete plus a lookup by learner code.
 * `put` replaces the whole record (last write wins).
 */
export interface ProgressStore {
  readonly kind: string;
  get(id: string): Promise<LearnerRecord | null>;
  findByCode(code: string): Promise<LearnerRecord | null>;
  put(record: LearnerRecord): Promise<void>;
  delete(id: string): Promise<void>;
  close?(): Promise<void>;
}

export const MAX_SESSIONS = 50;
export const MAX_CORRECTIONS = 30;
export const MAX_TEXT = 200;
