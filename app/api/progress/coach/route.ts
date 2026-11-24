import { NextRequest, NextResponse } from 'next/server';
import { clientKey } from '@/lib/progress/http';
import { applyCompletion, applyCorrection, createRateLimiter, getCoachToolBaseUrl, verifyToolToken } from '@/lib/progress/service';
import { getProgressStore } from '@/lib/progress/store';

const allow = createRateLimiter(120, 10 * 60 * 1000);

// The JSON returned here is handed to the model as the tool result.
const result = (ok: boolean, message: string, status = 200) =>
  NextResponse.json({ ok, message }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Coach tool endpoint, called by Agora's cloud during a session when
 * COACH_TOOL_BASE_URL is set. It is publicly reachable, so every call must
 * carry the per-session token minted at session start; the token decides
 * which learner and lesson are written, never the request body.
 */
export async function POST(request: NextRequest) {
  if (!getCoachToolBaseUrl()) return result(false, 'Coach tools are not enabled.', 404);
  if (!allow(clientKey(request))) return result(false, 'Too many requests.', 429);
  const claims = verifyToolToken(request.headers.get('authorization')?.replace(/^Bearer\s+/i, ''));
  if (!claims) return result(false, 'Not authorized.', 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return result(false, 'Invalid JSON body.', 400);
  }
  if (!body || typeof body !== 'object') return result(false, 'Invalid request.', 400);

  try {
    const store = await getProgressStore();
    const record = await store.get(claims.learnerId);
    if (!record) return result(false, 'This learner has no saved progress any more.', 404);
    if (body.type === 'correction') {
      if (!applyCorrection(record, claims.language, claims.lessonId, body)) {
        return result(false, 'learner_phrase and alternative are required.', 400);
      }
      await store.put(record);
      return result(true, 'Correction saved.');
    }
    if (body.type === 'objective' && typeof body.met === 'boolean') {
      // "Not met" never clears a completion the learner already has.
      if (body.met) applyCompletion(record, claims.language, claims.lessonId, true, 'coach');
      await store.put(record);
      return result(true, body.met ? 'Lesson marked complete.' : 'Noted. The lesson stays open for more practice.');
    }
    return result(false, 'Unknown tool call.', 400);
  } catch (error) {
    console.error('Coach tool save failed:', error instanceof Error ? error.message : 'unknown error');
    return result(false, 'Progress could not be saved.', 503);
  }
}

export const dynamic = 'force-dynamic';
