import { NextRequest } from 'next/server';
import { isLessonId, isPracticeLanguage } from '@/lib/lessons';
import { errorResponse, learnerIdFrom, viewResponse } from '@/lib/progress/http';
import { LEARNER_COOKIE, applyCompletion, applySession, createLearner, loadLearner, parseSession } from '@/lib/progress/service';
import { getProgressStore } from '@/lib/progress/store';

// Reading never creates a learner: the cookie appears with the first save.
export async function GET(request: NextRequest) {
  try {
    const store = await getProgressStore();
    return viewResponse(await loadLearner(store, learnerIdFrom(request)));
  } catch (error) {
    console.error('Progress read failed:', error instanceof Error ? error.message : error);
    return errorResponse('Saved progress is unavailable', 503);
  }
}

/**
 * Saves progress reported by the browser:
 * - `{ action: 'session', session }` records a finished session (idempotent by session id)
 * - `{ action: 'complete', language, lessonId, completed }` marks or unmarks a lesson
 * - `{ action: 'code' }` only ensures a learner exists so a code can be shown
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  if (!body || typeof body !== 'object') return errorResponse('Invalid request', 400);

  const session = body.action === 'session' ? parseSession(body.session) : null;
  const completion = body.action === 'complete' && isPracticeLanguage(body.language) && isLessonId(body.lessonId)
    && typeof body.completed === 'boolean'
    ? { language: body.language, lessonId: body.lessonId, completed: body.completed }
    : null;
  if (body.action !== 'code' && !session && !completion) return errorResponse('Invalid progress update', 400);

  try {
    const store = await getProgressStore();
    const record = (await loadLearner(store, learnerIdFrom(request))) ?? createLearner();
    if (session) applySession(record, session);
    if (completion) applyCompletion(record, completion.language, completion.lessonId, completion.completed, 'learner');
    await store.put(record);
    return viewResponse(record);
  } catch (error) {
    console.error('Progress save failed:', error instanceof Error ? error.message : error);
    return errorResponse('Progress could not be saved', 503);
  }
}

/** Deletes everything stored for this learner and forgets the cookie. */
export async function DELETE(request: NextRequest) {
  try {
    const store = await getProgressStore();
    const record = await loadLearner(store, learnerIdFrom(request));
    if (record) await store.delete(record.id);
    const response = viewResponse(null);
    response.cookies.delete(LEARNER_COOKIE);
    return response;
  } catch (error) {
    console.error('Progress reset failed:', error instanceof Error ? error.message : error);
    return errorResponse('Progress could not be reset', 503);
  }
}

export const dynamic = 'force-dynamic';
