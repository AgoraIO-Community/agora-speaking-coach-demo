// Server-side conversation logging from Agora's notification webhook.
//
// What Agora sends (docs.agora.io/en/ai/build/handle-runtime-events/webhooks):
// a signed POST with { noticeId, productId, eventType, notifyMs, payload }.
// eventType 103 ("agent history") arrives after an agent stops and carries the
// agent's stored dialogue: payload.contents[] of { role, content }. Its length
// is capped by `llm.max_history` set at session start, so a very long session
// can arrive without its earliest turns.
//
// The browser's real-time transcript is display only and is never stored.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isLessonId, isPracticeLanguage, type LessonId, type PracticeLanguage } from '../lessons';
import { getPublicBaseUrl } from './service';
import {
  CONVERSATION_RETENTION_DAYS, MAX_AGENT_LINKS, MAX_CONVERSATIONS, MAX_CONVERSATION_TURNS, MAX_TURN_TEXT,
  type ConversationRecord, type LearnerRecord,
} from './types';

export const WEBHOOK_PATH = '/api/agora-webhook';
export const AGENT_HISTORY_EVENT = 103;

/**
 * Conversation logging is on only when both are set:
 * - COACH_PUBLIC_BASE_URL: the public address Agora calls (also used by coach tools)
 * - AGORA_WEBHOOK_SECRET: the signing secret of the project's webhook configuration
 * With either missing nothing is logged and no agent-to-learner link is saved.
 */
export function getConversationLogging(env: NodeJS.ProcessEnv = process.env): { webhookUrl: string; secret: string } | null {
  const baseUrl = getPublicBaseUrl(env);
  const secret = env.AGORA_WEBHOOK_SECRET?.trim();
  return baseUrl && secret ? { webhookUrl: `${baseUrl}${WEBHOOK_PATH}`, secret } : null;
}

/** One line for logs and the doctor script. Never includes the secret. */
export function describeConversationLogging(env: NodeJS.ProcessEnv = process.env): string {
  const logging = getConversationLogging(env);
  if (logging) return `Conversation logging: configured. Agora must deliver "agent history" events to ${logging.webhookUrl}`;
  const missing = [
    env.COACH_PUBLIC_BASE_URL?.trim() ? null : 'COACH_PUBLIC_BASE_URL',
    env.AGORA_WEBHOOK_SECRET?.trim() ? null : 'AGORA_WEBHOOK_SECRET',
  ].filter(Boolean).join(' and ');
  return `Conversation logging: off (${missing} not set). Conversations are not stored.`;
}

/** Agora signs the raw body with HMAC-SHA256 (hex) in the Agora-Signature-V2 header. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

const AGENT_ID = /^[A-Za-z0-9_-]{6,128}$/;
export const isAgentId = (value: unknown): value is string => typeof value === 'string' && AGENT_ID.test(value);

/** Remembers which lesson a started agent belongs to. */
export function applyAgentStart(
  record: LearnerRecord, agentId: string, language: PracticeLanguage, lessonId: LessonId, now = new Date(),
) {
  record.agents = [
    ...record.agents.filter((agent) => agent.agentId !== agentId),
    { agentId, language, lessonId, startedAt: now.toISOString() },
  ].slice(-MAX_AGENT_LINKS);
  record.updatedAt = now.toISOString();
}

const toIso = (seconds: unknown, fallback: string) =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : fallback;

/** Drops conversations beyond the count and age limits. */
export function pruneConversations(record: LearnerRecord, now = new Date()) {
  const oldest = now.getTime() - CONVERSATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  record.conversations = record.conversations
    .filter((conversation) => Date.parse(conversation.endedAt) >= oldest)
    .slice(-MAX_CONVERSATIONS);
}

export type ConversationResult = 'stored' | 'duplicate' | 'unknown-agent' | 'invalid';

/**
 * Stores the dialogue from an "agent history" payload. Idempotent by agent id:
 * a retried or replayed event for a conversation already stored changes nothing.
 */
export function applyConversation(record: LearnerRecord, payload: unknown, now = new Date()): ConversationResult {
  const value = payload as { agent_id?: unknown; contents?: unknown; start_ts?: unknown; stop_ts?: unknown } | null;
  if (!value || !isAgentId(value.agent_id) || !Array.isArray(value.contents)) return 'invalid';
  const agent = record.agents.find(({ agentId }) => agentId === value.agent_id);
  if (!agent || !isPracticeLanguage(agent.language) || !isLessonId(agent.lessonId)) return 'unknown-agent';
  if (record.conversations.some(({ agentId }) => agentId === value.agent_id)) return 'duplicate';

  let truncated = value.contents.length > MAX_CONVERSATION_TURNS;
  const turns: ConversationRecord['turns'] = [];
  // Keep the most recent turns when there are too many.
  for (const item of value.contents.slice(-MAX_CONVERSATION_TURNS) as { role?: unknown; content?: unknown }[]) {
    if ((item?.role !== 'user' && item?.role !== 'assistant') || typeof item.content !== 'string') continue;
    const content = item.content.trim();
    if (!content) continue;
    if (content.length > MAX_TURN_TEXT) truncated = true;
    turns.push({ role: item.role, content: content.slice(0, MAX_TURN_TEXT) });
  }
  record.conversations = [...record.conversations, {
    agentId: agent.agentId,
    language: agent.language,
    lessonId: agent.lessonId,
    startedAt: toIso(value.start_ts, agent.startedAt),
    endedAt: toIso(value.stop_ts, now.toISOString()),
    turns,
    truncated,
  }];
  pruneConversations(record, now);
  record.updatedAt = now.toISOString();
  return 'stored';
}
