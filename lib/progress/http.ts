import { NextRequest, NextResponse } from 'next/server';
import { LEARNER_COOKIE, LEARNER_COOKIE_MAX_AGE, getPublicBaseUrl, toView } from './service';
import { getConversationLogging } from './conversations';
import type { LearnerRecord } from './types';

export const learnerIdFrom = (request: NextRequest) => request.cookies.get(LEARNER_COOKIE)?.value;

export function setLearnerCookie(response: NextResponse, id: string) {
  response.cookies.set(LEARNER_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: LEARNER_COOKIE_MAX_AGE,
  });
}

export const progressMode = () => (getPublicBaseUrl() ? 'coach' : 'browser');

/** Progress responses are per-learner and must never be cached by intermediaries. */
export function viewResponse(record: LearnerRecord | null, init?: { status?: number }) {
  const response = NextResponse.json(toView(record, progressMode(), getConversationLogging() !== null), init);
  response.headers.set('Cache-Control', 'no-store');
  if (record) setLearnerCookie(response, record.id);
  return response;
}

export const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export const clientKey = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
