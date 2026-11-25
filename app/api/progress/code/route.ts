import { NextRequest } from 'next/server';
import { clientKey, errorResponse, viewResponse } from '@/lib/progress/http';
import { createRateLimiter, findLearnerByCode, normalizeCode } from '@/lib/progress/service';
import { getProgressStore } from '@/lib/progress/store';

// Ten attempts per ten minutes per client address, per server process.
const allow = createRateLimiter(10, 10 * 60 * 1000);

/**
 * Switches this browser to the learner that owns the code. The code is a
 * bearer secret and is never logged. Progress saved on this browser under a
 * different learner is left in the store but no longer linked to it.
 */
export async function POST(request: NextRequest) {
  if (!allow(clientKey(request))) return errorResponse('Too many attempts. Try again in a few minutes.', 429);
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  const code = normalizeCode(body?.code);
  if (!code) return errorResponse('That does not look like a learner code', 400);
  try {
    const record = await findLearnerByCode(await getProgressStore(), code);
    if (!record) return errorResponse('No saved progress matches that code', 404);
    return viewResponse(record);
  } catch (error) {
    console.error('Learner code lookup failed:', error instanceof Error ? error.message : 'unknown error');
    return errorResponse('Saved progress is unavailable', 503);
  }
}

export const dynamic = 'force-dynamic';
