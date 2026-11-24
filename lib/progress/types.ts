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

/** A started agent, kept so a later webhook event can be tied to its lesson. */
export type AgentSession = { agentId: string; language: string; lessonId: string; startedAt: string };

/**
 * Conversation text delivered by Agora's history webhook after a session.
 * Stored only when conversation logging is configured. Never audio.
 */
export type ConversationRecord = {
  agentId: string;
  language: string;
  lessonId: string;
  startedAt: string;
  endedAt: string;
  turns: { role: 'user' | 'assistant'; content: string }[];
  /** True when turns or text were cut to fit the storage caps. */
  truncated: boolean;
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
  /** Agents started while conversation logging was configured. */
  agents: AgentSession[];
  /** Logged conversations, newest last. Empty unless conversation logging is configured. */
  conversations: ConversationRecord[];
};

/**
 * Storage adapter contract. Records are small documents keyed by learner id;
 * adapters need get/put/delete, a lookup by learner code, and an index from
 * a started agent to its learner (used by the conversation webhook).
 * `put` replaces the whole record (last write wins). `delete` also removes
 * the learner's agent links.
 */
export interface ProgressStore {
  readonly kind: string;
  get(id: string): Promise<LearnerRecord | null>;
  findByCode(code: string): Promise<LearnerRecord | null>;
  put(record: LearnerRecord): Promise<void>;
  delete(id: string): Promise<void>;
  linkAgent(agentId: string, learnerId: string): Promise<void>;
  findByAgent(agentId: string): Promise<LearnerRecord | null>;
  close?(): Promise<void>;
}

export const MAX_SESSIONS = 50;
export const MAX_CORRECTIONS = 30;
export const MAX_TEXT = 200;
/** Retention for logged conversations: the newest N per learner, and nothing older than the day limit. */
export const MAX_CONVERSATIONS = 20;
export const CONVERSATION_RETENTION_DAYS = 90;
export const MAX_CONVERSATION_TURNS = 200;
export const MAX_TURN_TEXT = 2000;
export const MAX_AGENT_LINKS = 20;
