import { NextRequest, NextResponse } from 'next/server';
import {
  AGENT_HISTORY_EVENT, applyConversation, getConversationLogging, isAgentId, verifyWebhookSignature,
} from '@/lib/progress/conversations';
import { getProgressStore } from '@/lib/progress/store';

const MAX_BODY_BYTES = 1024 * 1024;
const reply = (status: number, result: string) =>
  NextResponse.json({ result }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Agora notification webhook. Stores the conversation text of a finished
 * session ("agent history", eventType 103) in the progress store.
 *
 * - Disabled (404) unless COACH_PUBLIC_BASE_URL and AGORA_WEBHOOK_SECRET are set.
 * - Every request must carry a valid Agora-Signature-V2 over the raw body.
 * - Accepted events always get a 200 so Agora does not retry them; a retried
 *   or replayed history event is ignored (idempotent by agent id).
 * - Message text is never written to server logs.
 */
export async function POST(request: NextRequest) {
  const logging = getConversationLogging();
  if (!logging) return reply(404, 'conversation logging is not configured');

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return reply(413, 'payload too large');
  if (!verifyWebhookSignature(rawBody, request.headers.get('agora-signature-v2'), logging.secret)) {
    return reply(401, 'invalid signature');
  }

  let event: { noticeId?: unknown; eventType?: unknown; payload?: { agent_id?: unknown } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return reply(400, 'invalid JSON');
  }
  // Other subscribed events (agent joined, left, errors, metrics, health checks) are acknowledged and not stored.
  if (event?.eventType !== AGENT_HISTORY_EVENT) return reply(200, 'ignored');
  if (!isAgentId(event.payload?.agent_id)) return reply(200, 'invalid');

  try {
    const store = await getProgressStore();
    const record = await store.findByAgent(event.payload.agent_id);
    // Unknown agent: started elsewhere, before logging was enabled, or its learner reset their progress.
    if (!record) return reply(200, 'unknown-agent');
    const result = applyConversation(record, event.payload);
    if (result === 'stored') await store.put(record);
    return reply(200, result);
  } catch (error) {
    // A 5xx asks Agora to deliver the event again later.
    console.error('Conversation log save failed:', error instanceof Error ? error.message : 'unknown error');
    return reply(503, 'store unavailable');
  }
}

export const dynamic = 'force-dynamic';
