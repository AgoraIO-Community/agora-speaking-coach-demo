// Saved progress checks: storage adapters, learner identity, API routes,
// prompt history and both completion modes. Everything here is local and
// mocked; no Agora session, Postgres database or public tool URL is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Agent } from 'agora-agents';
import { NextRequest } from 'next/server';
import { getScenarioPrompt } from '../lib/agent-config';
import { getScenarioTools } from '../lib/agent-tools';
import {
  applyAgentStart, applyConversation, describeConversationLogging, getConversationLogging, pruneConversations,
  verifyWebhookSignature,
} from '../lib/progress/conversations';
import { createHmac } from 'node:crypto';
import { createFileStore } from '../lib/progress/file-store';
import {
  LEARNER_COOKIE, applyCompletion, applyCorrection, applySession, applyStart, createLearner, createRateLimiter,
  findLearnerByCode, getPublicBaseUrl, getLearnerHistory, normalizeCode, parseSession, signToolToken, toView,
  verifyToolToken,
} from '../lib/progress/service';
import { createSqliteStore } from '../lib/progress/sqlite-store';
import { createProgressStore, resetProgressStore } from '../lib/progress/store';
import { MAX_CONVERSATIONS, MAX_CONVERSATION_TURNS, MAX_CORRECTIONS, MAX_SESSIONS, MAX_TURN_TEXT, type ProgressStore } from '../lib/progress/types';
import { EMPTY_PROGRESS, getContinueTarget, getLessonState, withCompletion, withSession } from '../lib/progress/view';

const temporary = (label: string) => fs.mkdtempSync(path.join(os.tmpdir(), `coach-progress-${label}-`));
const session = (id: string, lessonId = 'introduce-yourself', learnerTurns = 4) => ({
  id, language: 'es', lessonId, startedAt: '2026-11-20T15:00:00.000Z', endedAt: '2026-11-20T15:08:00.000Z', learnerTurns,
});

/** The contract every adapter must meet. */
async function storeContract(label: string, open: () => Promise<ProgressStore>) {
  let store = await open();
  const first = createLearner();
  const second = createLearner();
  assert.equal(await store.get(first.id), null, `${label}: unknown learner`);
  assert.equal(await store.findByCode(first.code), null, `${label}: unknown code`);
  await store.put(first);
  await store.put(second);
  assert.deepEqual(await store.get(first.id), first, `${label}: round trip`);
  assert.deepEqual(await store.findByCode(second.code), second, `${label}: lookup by code`);
  applySession(first, parseSession(session('contract-session-1'))!);
  applyCompletion(first, 'es', 'introduce-yourself', true, 'learner');
  await store.put(first);
  assert.deepEqual(await store.get(first.id), first, `${label}: put replaces the record`);
  assert.deepEqual(await store.get(second.id), second, `${label}: other learners are untouched`);
  // Concurrent writers for different learners must both survive.
  const others = Array.from({ length: 8 }, () => createLearner());
  await Promise.all(others.map((record) => store.put(record)));
  for (const record of others) assert.deepEqual(await store.get(record.id), record, `${label}: concurrent puts`);
  // Data must survive reopening the store.
  await store.close?.();
  store = await open();
  assert.deepEqual(await store.get(first.id), first, `${label}: persists across reopen`);
  // Agent links survive a reopen and resolve to the learner's current record.
  assert.equal(await store.findByAgent('agent-contract-1'), null, `${label}: unknown agent`);
  await store.linkAgent('agent-contract-1', first.id);
  await store.linkAgent('agent-contract-2', second.id);
  await store.linkAgent('agent-contract-1', first.id);
  assert.deepEqual(await store.findByAgent('agent-contract-1'), first, `${label}: lookup by agent`);
  await store.delete(first.id);
  assert.equal(await store.get(first.id), null, `${label}: delete`);
  assert.equal(await store.findByAgent('agent-contract-1'), null, `${label}: delete removes agent links`);
  assert.deepEqual(await store.findByAgent('agent-contract-2'), second, `${label}: other links are untouched`);
  assert.equal(await store.findByCode(first.code), null, `${label}: delete removes the code`);
  await store.delete(first.id);
  await store.close?.();
}

async function verifyStores() {
  const fileDirectory = temporary('file');
  await storeContract('file', async () => createFileStore(path.join(fileDirectory, 'progress.json')));
  assert.equal(fs.statSync(path.join(fileDirectory, 'progress.json')).mode & 0o077, 0, 'file store must not be group or world readable');
  const sqliteDirectory = temporary('sqlite');
  await storeContract('sqlite', () => createSqliteStore(path.join(sqliteDirectory, 'progress.sqlite')));

  const directory = temporary('select');
  assert.equal((await createProgressStore({ PROGRESS_DATA_DIR: directory } as unknown as NodeJS.ProcessEnv)).kind, 'file', 'file is the default store');
  const sqlite = await createProgressStore({ PROGRESS_STORE: 'sqlite', PROGRESS_DATA_DIR: directory } as unknown as NodeJS.ProcessEnv);
  assert.equal(sqlite.kind, 'sqlite');
  await sqlite.close?.();
  // Misconfiguration fails loudly instead of falling back to another store.
  await assert.rejects(createProgressStore({ PROGRESS_STORE: 'redis' } as unknown as NodeJS.ProcessEnv), /Unsupported PROGRESS_STORE "redis"/);
  await assert.rejects(createProgressStore({ PROGRESS_STORE: 'postgres' } as unknown as NodeJS.ProcessEnv), /requires DATABASE_URL/);
  console.log('Progress store contract passed: file, sqlite. Postgres is selected by configuration only and is not exercised here.');
}

function verifyRules() {
  const learner = createLearner();
  assert.match(learner.code, /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);
  assert.notEqual(createLearner().code, learner.code);
  assert.equal(normalizeCode(`${learner.code.slice(0, 5).toLowerCase()}-${learner.code.slice(5)} `), learner.code);
  for (const bad of ['', 'ABCDE-FGHJ', 'ABCDE-FGHJ0', 'ABCDEFGHJKL', 12345, null, 'x'.repeat(100)]) assert.equal(normalizeCode(bad), null);

  assert.equal(parseSession({ ...session('short') }), null, 'session id too short');
  assert.equal(parseSession({ ...session('valid-session-1'), language: 'zz' }), null);
  assert.equal(parseSession({ ...session('valid-session-1'), lessonId: 'not-a-lesson' }), null);
  assert.equal(parseSession({ ...session('valid-session-1'), learnerTurns: -1 }), null);
  assert.equal(parseSession({ ...session('valid-session-1'), endedAt: '2026-11-20T14:00:00.000Z' }), null, 'ended before started');
  assert.equal(parseSession('nope'), null);

  // A retried report is counted once.
  applySession(learner, parseSession(session('valid-session-1'))!);
  applySession(learner, parseSession(session('valid-session-1'))!);
  assert.equal(learner.sessions.length, 1);
  assert.equal(learner.languages.es.lessons['introduce-yourself'].sessions, 1);
  assert.equal(learner.languages.es.lessons['introduce-yourself'].completedAt, undefined, 'practicing is not completing');
  applyCompletion(learner, 'es', 'introduce-yourself', true, 'learner');
  applyCompletion(learner, 'es', 'introduce-yourself', true, 'coach');
  assert.equal(learner.languages.es.lessons['introduce-yourself'].completedBy, 'learner', 'first completion wins');
  applyCompletion(learner, 'es', 'introduce-yourself', false, 'learner');
  assert.equal(learner.languages.es.lessons['introduce-yourself'].completedAt, undefined);

  for (let index = 0; index < MAX_SESSIONS + 5; index += 1) applySession(learner, parseSession(session(`capped-session-${index}`))!);
  assert.equal(learner.sessions.length, MAX_SESSIONS, 'session history is capped');
  assert.equal(applyCorrection(learner, 'es', 'introduce-yourself', { learner_phrase: '', alternative: 'Vivo en Boston.' }), false);
  assert.equal(applyCorrection(learner, 'es', 'introduce-yourself', { learner_phrase: 7, alternative: 'x' }), false);
  for (let index = 0; index < MAX_CORRECTIONS + 5; index += 1) {
    assert.equal(applyCorrection(learner, 'es', 'introduce-yourself', { learner_phrase: `Yo vivir ${index} ${'x'.repeat(400)}`, alternative: 'Vivo en Boston.', note: 'Use vivo.' }), true);
  }
  assert.equal(learner.corrections.length, MAX_CORRECTIONS, 'corrections are capped');
  assert.ok(learner.corrections.every((correction) => correction.learnerPhrase.length <= 200), 'correction text is clipped');

  // The browser view never carries the learner id.
  const view = toView(learner, 'browser');
  assert.equal(JSON.stringify(view).includes(learner.id), false);
  assert.equal(view.code, `${learner.code.slice(0, 5)}-${learner.code.slice(5)}`);
  assert.deepEqual(toView(null, 'browser'), EMPTY_PROGRESS);

  // Pick up where the learner left off, and optimistic updates match the server rules.
  assert.equal(getContinueTarget(EMPTY_PROGRESS), null);
  let optimistic = withSession(EMPTY_PROGRESS, { language: 'ja', lessonId: 'introduce-yourself', endedAt: '2026-11-21T10:00:00.000Z' });
  assert.equal(getLessonState(optimistic, 'ja', 'introduce-yourself'), 'practiced');
  assert.deepEqual(getContinueTarget(optimistic), { language: 'ja', lessonId: 'introduce-yourself' });
  optimistic = withCompletion(optimistic, 'ja', 'introduce-yourself', true);
  assert.equal(getLessonState(optimistic, 'ja', 'introduce-yourself'), 'completed');
  assert.deepEqual(getContinueTarget(optimistic), { language: 'ja', lessonId: 'talk-with-a-colleague' }, 'continue with the next incomplete lesson');
  assert.equal(getLessonState(withCompletion(optimistic, 'ja', 'introduce-yourself', false), 'ja', 'introduce-yourself'), 'practiced');

  const allow = createRateLimiter(3, 1000);
  assert.deepEqual([1, 2, 3, 4].map(() => allow('a', 0)), [true, true, true, false]);
  assert.equal(allow('b', 0), true, 'limits are per client');
  assert.equal(allow('a', 1001), true, 'the window resets');
  // Logged conversations: only for agents this learner started, stored once, capped and pruned.
  const logged = createLearner();
  const history = (agentId: string, contents: unknown, stop = 1_795_000_000) => ({ agent_id: agentId, start_ts: stop - 400, stop_ts: stop, contents });
  const turns = [{ role: 'assistant', content: 'Hola. ¿Cómo te llamas?' }, { role: 'user', content: ' Me llamo Alex. ' }, { role: 'system', content: 'ignored' }, { role: 'user', content: '' }];
  assert.equal(applyConversation(logged, history('agent-rule-0001', turns)), 'unknown-agent', 'agents the learner never started are refused');
  assert.equal(applyConversation(logged, { agent_id: 'agent-rule-0001' }), 'invalid');
  assert.equal(applyConversation(logged, null), 'invalid');
  applyAgentStart(logged, 'agent-rule-0001', 'es', 'introduce-yourself');
  assert.equal(applyConversation(logged, history('agent-rule-0001', turns), new Date(1_795_000_100_000)), 'stored');
  assert.equal(applyConversation(logged, history('agent-rule-0001', [{ role: 'user', content: 'replayed' }])), 'duplicate', 'a replayed event changes nothing');
  assert.deepEqual(logged.conversations[0].turns, [{ role: 'assistant', content: 'Hola. ¿Cómo te llamas?' }, { role: 'user', content: 'Me llamo Alex.' }]);
  assert.equal(logged.conversations[0].lessonId, 'introduce-yourself');
  assert.equal(logged.conversations[0].truncated, false);
  assert.equal(logged.conversations[0].endedAt, new Date(1_795_000_000_000).toISOString());
  applyAgentStart(logged, 'agent-rule-0002', 'es', 'order-a-meal');
  const long = Array.from({ length: MAX_CONVERSATION_TURNS + 10 }, (_, index) => ({ role: index % 2 ? 'user' : 'assistant', content: `${index} ${'x'.repeat(MAX_TURN_TEXT + 50)}` }));
  assert.equal(applyConversation(logged, history('agent-rule-0002', long), new Date(1_795_000_100_000)), 'stored');
  assert.equal(logged.conversations[1].turns.length, MAX_CONVERSATION_TURNS);
  assert.ok(logged.conversations[1].turns.every((turn) => turn.content.length <= MAX_TURN_TEXT));
  assert.match(logged.conversations[1].turns.at(-1)!.content, new RegExp(`^${MAX_CONVERSATION_TURNS + 9} `), 'the most recent turns are kept');
  assert.equal(logged.conversations[1].truncated, true);
  // The browser sees metadata only; conversation text stays on the server.
  const loggedView = toView(logged, 'browser', true);
  assert.equal(loggedView.logging, true);
  assert.deepEqual(loggedView.conversations[0], { language: 'es', lessonId: 'introduce-yourself', endedAt: logged.conversations[0].endedAt, turns: 2 });
  assert.equal(JSON.stringify(loggedView).includes('Me llamo Alex'), false);
  assert.match(getLearnerHistory({ ...logged, languages: { es: { lastLessonId: 'order-a-meal', lessons: {} } }, conversations: [logged.conversations[0]] }, 'es', 'order-a-meal')!,
    /From the last logged conversation \(2026-11-\d\d, lesson "Introduce yourself"\), the learner's final turns as recognized were: "Me llamo Alex\."/);
  // Retention: newest conversations only, nothing older than the day limit.
  for (let index = 0; index < MAX_CONVERSATIONS + 3; index += 1) {
    applyAgentStart(logged, `agent-many-${index}`, 'es', 'introduce-yourself');
    applyConversation(logged, history(`agent-many-${index}`, turns, 1_795_000_000 + index), new Date(1_795_000_100_000));
  }
  assert.equal(logged.conversations.length, MAX_CONVERSATIONS);
  pruneConversations(logged, new Date(1_795_000_000_000 + 91 * 24 * 60 * 60 * 1000));
  assert.equal(logged.conversations.length, 0, 'conversations older than the retention window are dropped');

  const secret = 'webhook-secret-for-checks';
  const body = JSON.stringify({ noticeId: 'n1', eventType: 103, payload: {} });
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, signature, secret), true);
  assert.equal(verifyWebhookSignature(body, signature.toUpperCase(), secret), true);
  assert.equal(verifyWebhookSignature(`${body} `, signature, secret), false, 'the raw body is what is signed');
  assert.equal(verifyWebhookSignature(body, signature, 'another-secret'), false);
  for (const bad of [null, '', 'abc', createHmac('sha1', secret).update(body).digest('hex')]) assert.equal(verifyWebhookSignature(body, bad, secret), false);
  const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;
  assert.equal(getConversationLogging(env({})), null);
  assert.equal(getConversationLogging(env({ COACH_PUBLIC_BASE_URL: 'https://abc.ngrok.app' })), null, 'a URL without the secret does not enable logging');
  assert.equal(getConversationLogging(env({ AGORA_WEBHOOK_SECRET: secret })), null, 'a secret without the URL does not enable logging');
  assert.deepEqual(getConversationLogging(env({ COACH_PUBLIC_BASE_URL: 'https://abc.ngrok.app/', AGORA_WEBHOOK_SECRET: secret })), { webhookUrl: 'https://abc.ngrok.app/api/agora-webhook', secret });
  assert.match(describeConversationLogging(env({})), /off \(COACH_PUBLIC_BASE_URL and AGORA_WEBHOOK_SECRET not set\)\. Conversations are not stored/);
  const described = describeConversationLogging(env({ COACH_PUBLIC_BASE_URL: 'https://abc.ngrok.app', AGORA_WEBHOOK_SECRET: secret }));
  assert.match(described, /configured.*https:\/\/abc\.ngrok\.app\/api\/agora-webhook/);
  assert.equal(described.includes(secret), false, 'the secret is never printed');
  console.log('Progress rules passed: codes, session idempotency, completion, caps, view, continue target, conversation log and webhook signature.');
}

function verifyPromptAndTools() {
  const fresh = getScenarioPrompt(undefined, 'es', 'order-a-meal');
  assert.match(fresh, /# Learner history\n\nNo saved practice history is available for this learner in Spanish/);
  assert.match(fresh, /do not invent earlier sessions/);
  assert.match(fresh, /You have no tools and cannot save or look up anything yourself/);
  assert.doesNotMatch(fresh, /record_correction|record_objective_result/);
  assert.match(fresh, /Audio is never saved by this app/);
  assert.match(fresh, /The text of this conversation is not stored by this app after the call/);
  assert.match(getScenarioPrompt(undefined, 'es', 'order-a-meal', { logging: true }), /The text of this conversation is saved to the learner's practice history after the call/);
  assert.match(fresh, /it is never a score or a proficiency level/);

  const learner = createLearner();
  assert.equal(getLearnerHistory(null, 'es', 'order-a-meal'), null);
  assert.equal(getLearnerHistory(learner, 'es', 'order-a-meal'), null, 'no history before any practice in this language');
  applySession(learner, parseSession(session('history-session-1'))!);
  applyCompletion(learner, 'es', 'introduce-yourself', true, 'learner');
  applyStart(learner, 'es', 'talk-with-a-colleague');
  applyCorrection(learner, 'es', 'introduce-yourself', { learner_phrase: 'Yo vivir en Boston.', alternative: 'Vivo en Boston.', note: 'Use vivo for I live.' });
  assert.equal(getLearnerHistory(learner, 'fr', 'order-a-meal'), null, 'history is per language');
  const history = getLearnerHistory(learner, 'es', 'order-a-meal')!;
  assert.match(history, /Lessons marked complete: Introduce yourself\./);
  assert.match(history, /Lessons practiced but not marked complete: Talk with a colleague\./);
  assert.match(history, /Last finished session: 2026-11-20, lesson "Introduce yourself", 4 learner turns\./);
  assert.match(history, /Today's lesson "Order a meal": not practiced before\./);
  assert.match(history, /learner said "Yo vivir en Boston\."; suggested "Vivo en Boston\."/);
  assert.equal(history.includes(learner.id) || history.includes(learner.code), false, 'history never carries identifiers');
  const withHistory = getScenarioPrompt(undefined, 'es', 'order-a-meal', { history });
  assert.ok(withHistory.includes(history));
  assert.match(withHistory, /saved practice history, not a proficiency assessment/);
  assert.doesNotMatch(withHistory, /No saved practice history is available/);
  // The guardrails that matter stay in every variant.
  for (const prompt of [fresh, withHistory, getScenarioPrompt(undefined, 'es', 'order-a-meal', { history, tools: true })]) {
    assert.match(prompt, /Do not score or assess pronunciation, accent/);
    assert.match(prompt, /Do not invent a score, CEFR level or lesson completion/);
  }

  assert.deepEqual(getScenarioTools(), [], 'no tools without a public tool URL');
  const tools = getScenarioTools({ baseUrl: 'https://coach.example.test', token: 'session-token' });
  assert.deepEqual(tools.map((tool) => tool.function.name), ['record_correction', 'record_objective_result']);
  for (const tool of tools) {
    assert.equal(tool.type, 'function');
    assert.equal(tool.server.method, 'POST');
    assert.equal(tool.server.url, 'https://coach.example.test/api/progress/coach');
    assert.equal(tool.server.headers?.Authorization, 'Bearer session-token');
    assert.doesNotMatch(JSON.stringify(tool.server.headers), /\{\{args\./, 'model arguments must not reach headers');
    assert.equal(tool.function.parameters.type, 'object');
  }
  const toolPrompt = getScenarioPrompt(undefined, 'es', 'order-a-meal', { tools: true });
  assert.match(toolPrompt, /record_correction/);
  assert.match(toolPrompt, /call record_objective_result once with the honest result/);
  assert.match(toolPrompt, /Never record lesson examples or common-error fixtures/);
  assert.doesNotMatch(toolPrompt, /You have no tools/);

  assert.equal(getPublicBaseUrl({} as unknown as NodeJS.ProcessEnv), null);
  assert.equal(getPublicBaseUrl({ COACH_PUBLIC_BASE_URL: ' https://abc.ngrok.app/ ' } as unknown as NodeJS.ProcessEnv), 'https://abc.ngrok.app');
  assert.throws(() => getPublicBaseUrl({ COACH_PUBLIC_BASE_URL: 'abc.ngrok.app' } as unknown as NodeJS.ProcessEnv), /must be a full URL/);
  assert.throws(() => getPublicBaseUrl({ COACH_PUBLIC_BASE_URL: 'ftp://abc' } as unknown as NodeJS.ProcessEnv), /http or https/);

  const env = { NEXT_AGORA_APP_CERTIFICATE: 'fedcba9876543210fedcba9876543210' } as unknown as NodeJS.ProcessEnv;
  const claims = { learnerId: learner.id, language: 'es' as const, lessonId: 'order-a-meal' as const, expiresAt: 2_000 };
  const token = signToolToken(claims, env);
  assert.deepEqual(verifyToolToken(token, env, 1_000), claims);
  assert.equal(verifyToolToken(token, env, 2_000), null, 'expired');
  assert.equal(verifyToolToken(token, { NEXT_AGORA_APP_CERTIFICATE: 'another-certificate' } as unknown as NodeJS.ProcessEnv, 1_000), null, 'wrong key');
  const forged = `${Buffer.from(JSON.stringify({ ...claims, learnerId: 'someone-else' })).toString('base64url')}.${token.split('.')[1]}`;
  assert.equal(verifyToolToken(forged, env, 1_000), null, 'tampered payload');
  for (const bad of [undefined, '', 'a.b.c', token.split('.')[0]]) assert.equal(verifyToolToken(bad, env, 1_000), null);
  assert.equal(token.includes(env.NEXT_AGORA_APP_CERTIFICATE!), false);
  console.log('Prompt history, tool definitions and tool token checks passed.');
}

type Call = { cookie?: string; body?: unknown; headers?: Record<string, string>; method?: string };
const cookieOf = (response: Response) => response.headers.get('set-cookie')?.match(new RegExp(`${LEARNER_COOKIE}=([^;]*)`))?.[1];
const request = (url: string, { cookie, body, headers, method = 'POST' }: Call = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { ...(cookie ? { cookie: `${LEARNER_COOKIE}=${cookie}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

async function verifyRoutes(store: 'file' | 'sqlite') {
  process.env.PROGRESS_STORE = store;
  process.env.PROGRESS_DATA_DIR = temporary(`routes-${store}`);
  delete process.env.COACH_PUBLIC_BASE_URL;
  delete process.env.AGORA_WEBHOOK_SECRET;
  await resetProgressStore();
  const webhook = await import('../app/api/agora-webhook/route');
  const progress = await import('../app/api/progress/route');
  const codeRoute = await import('../app/api/progress/code/route');
  const coach = await import('../app/api/progress/coach/route');

  // Reading never creates a learner or a cookie.
  let response: Response = await progress.GET(request('/api/progress', { method: 'GET' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(cookieOf(response), undefined, 'no cookie on read');
  assert.deepEqual(await response.json(), EMPTY_PROGRESS);
  response = await progress.GET(request('/api/progress', { method: 'GET', cookie: 'not-a-known-learner-id-000' }));
  assert.deepEqual(await response.json(), EMPTY_PROGRESS, 'unknown cookie reads as empty');

  for (const body of ['{', {}, { action: 'session' }, { action: 'session', session: { ...session('route-session-1'), language: 'zz' } },
    { action: 'complete', language: 'es', lessonId: 'nope', completed: true }, { action: 'complete', language: 'es', lessonId: 'order-a-meal', completed: 'yes' }]) {
    response = await progress.POST(request('/api/progress', { body }));
    assert.equal(response.status, 400, `bad input ${JSON.stringify(body)}`);
    assert.equal(cookieOf(response), undefined, 'bad input never creates a learner');
  }

  // First save creates the learner and sets an httpOnly cookie.
  response = await progress.POST(request('/api/progress', { body: { action: 'session', session: session('route-session-1') } }));
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  const cookie = cookieOf(response)!;
  let view = await response.json();
  assert.equal(view.saved, true);
  assert.equal(view.mode, 'browser');
  assert.match(view.code, /^[2-9A-Z]{5}-[2-9A-Z]{5}$/);
  assert.equal(view.languages.es.lessons['introduce-yourself'].sessions, 1);
  assert.equal(JSON.stringify(view).includes(cookie), false, 'the learner id stays in the cookie');
  const learnerCode: string = view.code;

  // A retried report does not count twice; completion is explicit.
  response = await progress.POST(request('/api/progress', { cookie, body: { action: 'session', session: session('route-session-1') } }));
  assert.equal((await response.json()).languages.es.lessons['introduce-yourself'].sessions, 1);
  response = await progress.POST(request('/api/progress', { cookie, body: { action: 'complete', language: 'es', lessonId: 'introduce-yourself', completed: true } }));
  view = await response.json();
  assert.equal(view.languages.es.lessons['introduce-yourself'].completedBy, 'learner');
  response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
  assert.deepEqual(await response.json(), view, 'read returns what was saved');

  // Another device: a wrong code is refused, the right code links this browser.
  response = await codeRoute.POST(request('/api/progress/code', { body: { code: 'not a code' } }));
  assert.equal(response.status, 400);
  response = await codeRoute.POST(request('/api/progress/code', { body: { code: '22222-22222' } }));
  assert.equal(response.status, 404);
  assert.equal(cookieOf(response), undefined);
  response = await codeRoute.POST(request('/api/progress/code', { body: { code: learnerCode.toLowerCase().replace('-', ' ') } }));
  assert.equal(response.status, 200);
  assert.equal(cookieOf(response), cookie, 'the code links to the same learner');
  assert.deepEqual(await response.json(), view);

  // The coach endpoint does not exist in browser mode.
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: true } }));
  assert.equal(response.status, 404);

  // Coach tool mode: only a valid per-session token can write, and only to its own learner and lesson.
  process.env.COACH_PUBLIC_BASE_URL = 'https://coach.example.test';
  process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';
  const token = signToolToken({ learnerId: cookie, language: 'es', lessonId: 'order-a-meal', expiresAt: Date.now() + 60_000 });
  const authorized = { Authorization: `Bearer ${token}` };
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: true } }));
  assert.equal(response.status, 401, 'no token');
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: true }, headers: { Authorization: `Bearer ${token}x` } }));
  assert.equal(response.status, 401, 'bad token');
  const expired = signToolToken({ learnerId: cookie, language: 'es', lessonId: 'order-a-meal', expiresAt: Date.now() - 1 });
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: true }, headers: { Authorization: `Bearer ${expired}` } }));
  assert.equal(response.status, 401, 'expired token');
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'correction', learner_phrase: 'Quiero un sopa.' }, headers: authorized }));
  assert.equal(response.status, 400);
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'delete-everything' }, headers: authorized }));
  assert.equal(response.status, 400);
  response = await coach.POST(request('/api/progress/coach', {
    headers: authorized,
    // The body cannot redirect the write to another learner or lesson.
    body: { type: 'correction', learner_phrase: 'Quiero un sopa.', alternative: 'Quiero una sopa.', note: 'Sopa is feminine.', learnerId: 'someone-else', lessonId: 'introduce-yourself' },
  }));
  assert.deepEqual(await response.json(), { ok: true, message: 'Correction saved.' });
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: false }, headers: authorized }));
  assert.equal(response.status, 200);
  response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
  view = await response.json();
  assert.equal(view.mode, 'coach');
  assert.equal(view.languages.es.lessons['order-a-meal'], undefined, '"not met" does not create or complete a lesson');
  assert.equal(view.languages.es.lessons['introduce-yourself'].completedBy, 'learner', 'other lessons are untouched');
  assert.deepEqual(view.corrections.map((c: { lessonId: string; learnerPhrase: string }) => [c.lessonId, c.learnerPhrase]), [['order-a-meal', 'Quiero un sopa.']]);
  response = await coach.POST(request('/api/progress/coach', { body: { type: 'objective', met: true }, headers: authorized }));
  assert.deepEqual(await response.json(), { ok: true, message: 'Lesson marked complete.' });
  response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
  assert.equal((await response.json()).languages.es.lessons['order-a-meal'].completedBy, 'coach');

  // Invite: history reaches the prompt, tools follow the mode, the store never blocks startup.
  process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
  const { POST: invite } = await import('../app/api/invite-agent/route');
  const originalCreate = Agent.prototype.createSession;
  let captured: Agent | null = null;
  let nextAgentId = 'progress-check-agent';
  Agent.prototype.createSession = (function (this: Agent) {
    captured = this;
    return { start: async () => nextAgentId };
  }) as unknown as typeof Agent.prototype.createSession;
  const start = (callCookie?: string, lessonId = 'ask-for-the-check') => invite(request('/api/invite-agent', {
    cookie: callCookie,
    body: { requester_id: 'voice-user', channel_name: 'progress-channel', practice_language: 'es', lesson_id: lessonId },
  }));
  try {
    response = await start(cookie);
    assert.equal(response.status, 200);
    assert.equal(cookieOf(response), cookie);
    let agent = captured as unknown as Agent;
    assert.match(agent.instructions!, /Lessons marked complete: Introduce yourself; Order a meal\./);
    assert.match(agent.instructions!, /Today's lesson "Ask for the check": not practiced before\./);
    assert.match(agent.instructions!, /learner said "Quiero un sopa\."/);
    assert.equal(agent.advancedFeatures?.enable_tools, true);
    assert.equal(agent.llm?.tools?.length, 2);
    const sessionToken = String(agent.llm!.tools![0].server.headers!.Authorization).replace('Bearer ', '');
    assert.deepEqual(
      (({ learnerId, language, lessonId }) => ({ learnerId, language, lessonId }))(verifyToolToken(sessionToken)!),
      { learnerId: cookie, language: 'es', lessonId: 'ask-for-the-check' },
      'the session token is bound to this learner and lesson',
    );
    assert.equal(agent.instructions!.includes(cookie) || agent.instructions!.includes(learnerCode.replace('-', '')), false, 'no identifiers in the prompt');
    response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
    view = await response.json();
    assert.equal(view.languages.es.lastLessonId, 'ask-for-the-check', 'starting a session records the lesson as started');
    assert.equal(view.languages.es.lessons['ask-for-the-check'].sessions, 0, 'a start is not a finished session');

    // A first-time learner gets a cookie at start and an empty history.
    response = await start();
    const newcomer = cookieOf(response)!;
    assert.ok(newcomer && newcomer !== cookie);
    agent = captured as unknown as Agent;
    assert.match(agent.instructions!, /No saved practice history is available/);

    // Conversation logging. Without the secret the webhook does not exist and no agent is linked.
    const sign = (rawBody: string, key = 'webhook-secret-for-checks') => ({ 'Agora-Signature-V2': createHmac('sha256', key).update(rawBody).digest('hex') });
    const historyEvent = (agentId: string, noticeId = 'notice-1') => JSON.stringify({
      noticeId, productId: 17, eventType: 103, notifyMs: Date.now(),
      payload: { agent_id: agentId, name: 'coach', channel: 'progress-channel', start_ts: 1_795_000_000, stop_ts: 1_795_000_400,
        contents: [{ role: 'assistant', content: 'La cuenta, por favor.' }, { role: 'user', content: 'La cuenta, por favor. Gracias.' }] },
    });
    const deliver = (rawBody: string, headers: Record<string, string> = sign(rawBody)) => webhook.POST(request('/api/agora-webhook', { body: rawBody, headers }));
    const liveStore = async () => (await import('../lib/progress/store')).getProgressStore();
    response = await deliver(historyEvent('progress-check-agent'));
    assert.equal(response.status, 404, 'no webhook without the secret');
    assert.equal(await (await liveStore()).findByAgent('progress-check-agent'), null, 'no agent link is saved while logging is off');
    assert.match(agent.instructions!, /The text of this conversation is not stored by this app/);

    process.env.AGORA_WEBHOOK_SECRET = 'webhook-secret-for-checks';
    nextAgentId = 'logged-agent-0001';
    response = await start(cookie);
    assert.equal(response.status, 200);
    assert.match((captured as unknown as Agent).instructions!, /The text of this conversation is saved to the learner's practice history/);
    assert.equal((await (await liveStore()).findByAgent('logged-agent-0001'))?.id, cookie, 'the started agent is linked to its learner');
    response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
    assert.equal((await response.json()).logging, true);
    // Unsigned, wrongly signed and tampered requests are rejected before anything is read.
    const event = historyEvent('logged-agent-0001');
    assert.equal((await deliver(event, {})).status, 401, 'unsigned');
    assert.equal((await deliver(event, sign(event, 'wrong-secret'))).status, 401, 'wrong secret');
    assert.equal((await deliver(event.replace('Gracias', 'Adios'), sign(event))).status, 401, 'tampered body');
    assert.equal((await deliver('{', sign('{'))).status, 400);
    // Other events are acknowledged and not stored.
    const joined = JSON.stringify({ noticeId: 'notice-0', eventType: 101, payload: { agent_id: 'logged-agent-0001' } });
    assert.deepEqual(await (await deliver(joined)).json(), { result: 'ignored' });
    // A history event for an agent this app never linked is acknowledged, not stored.
    const stranger = historyEvent('some-other-agent-9');
    response = await deliver(stranger);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: 'unknown-agent' });
    // The real event is stored once; a retry or replay changes nothing.
    assert.deepEqual(await (await deliver(event)).json(), { result: 'stored' });
    const replay = historyEvent('logged-agent-0001', 'notice-2').replace('Gracias', 'Replayed');
    assert.deepEqual(await (await deliver(replay)).json(), { result: 'duplicate' });
    const stored = (await (await liveStore()).get(cookie))!;
    assert.equal(stored.conversations.length, 1);
    assert.deepEqual(stored.conversations[0].turns.map((turn) => turn.role), ['assistant', 'user']);
    assert.equal(stored.conversations[0].lessonId, 'ask-for-the-check');
    response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
    view = await response.json();
    assert.deepEqual(view.conversations.map((c: { lessonId: string; turns: number }) => [c.lessonId, c.turns]), [['ask-for-the-check', 2]]);
    assert.equal(JSON.stringify(view).includes('La cuenta'), false, 'conversation text is not sent to the browser');
    // The next session's instructions can draw on the logged conversation.
    nextAgentId = 'logged-agent-0002';
    await start(cookie);
    assert.match((captured as unknown as Agent).instructions!, /From the last logged conversation .*"La cuenta, por favor\. Gracias\."/);

    // Browser mode: same history, no tools.
    delete process.env.AGORA_WEBHOOK_SECRET;
    delete process.env.COACH_PUBLIC_BASE_URL;
    response = await start(cookie);
    agent = captured as unknown as Agent;
    assert.equal(agent.advancedFeatures?.enable_tools, false);
    assert.deepEqual(agent.llm?.tools ?? [], []);
    assert.match(agent.instructions!, /Lessons marked complete: Introduce yourself; Order a meal\./);
    assert.match(agent.instructions!, /You have no tools/);
    assert.match(agent.instructions!, /practiced 0 time\(s\) before|not practiced before|not marked complete/);

    // A misconfigured tool URL is a loud configuration error.
    process.env.COACH_PUBLIC_BASE_URL = 'not-a-url';
    const logError = console.error;
    console.error = () => {};
    try {
      response = await start(cookie);
    } finally {
      console.error = logError;
    }
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /COACH_PUBLIC_BASE_URL must be a full URL/);
    delete process.env.COACH_PUBLIC_BASE_URL;

    // A broken store must not stop a practice session.
    process.env.PROGRESS_STORE = 'postgres';
    delete process.env.DATABASE_URL;
    await resetProgressStore();
    const quiet = console.error;
    console.error = () => {};
    try {
      response = await start(cookie);
      assert.equal(response.status, 200, 'startup is independent of the progress store');
      assert.equal(cookieOf(response), undefined);
      assert.match((captured as unknown as Agent).instructions!, /No saved practice history is available/);
      response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
      assert.equal(response.status, 503, 'the progress API reports the store failure');
      response = await progress.POST(request('/api/progress', { cookie, body: { action: 'code' } }));
      assert.equal(response.status, 503, 'a failed save is reported, never faked');
    } finally {
      console.error = quiet;
    }
    process.env.PROGRESS_STORE = store;
    await resetProgressStore();
  } finally {
    Agent.prototype.createSession = originalCreate;
  }

  // Reset deletes the record and forgets the cookie; the code stops working.
  response = await progress.DELETE(request('/api/progress', { method: 'DELETE', cookie }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), EMPTY_PROGRESS);
  assert.match(response.headers.get('set-cookie')!, new RegExp(`${LEARNER_COOKIE}=;`));
  response = await progress.GET(request('/api/progress', { method: 'GET', cookie }));
  assert.deepEqual(await response.json(), EMPTY_PROGRESS);
  response = await codeRoute.POST(request('/api/progress/code', { body: { code: learnerCode } }));
  assert.equal(response.status, 404);
  const coachAfterReset = await findLearnerByCode(await (await import('../lib/progress/store')).getProgressStore(), learnerCode.replace('-', ''));
  assert.equal(coachAfterReset, null);
  // Reset also deletes logged conversations and agent links: a late or replayed event finds nothing.
  const afterReset = await (await import('../lib/progress/store')).getProgressStore();
  assert.equal(await afterReset.get(cookie), null);
  assert.equal(await afterReset.findByAgent('logged-agent-0001'), null);
  process.env.COACH_PUBLIC_BASE_URL = 'https://coach.example.test';
  process.env.AGORA_WEBHOOK_SECRET = 'webhook-secret-for-checks';
  const late = JSON.stringify({ noticeId: 'notice-3', eventType: 103, payload: { agent_id: 'logged-agent-0002', contents: [{ role: 'user', content: 'late' }] } });
  response = await webhook.POST(request('/api/agora-webhook', { body: late, headers: { 'Agora-Signature-V2': createHmac('sha256', 'webhook-secret-for-checks').update(late).digest('hex') } }));
  assert.deepEqual(await response.json(), { result: 'unknown-agent' });
  delete process.env.COACH_PUBLIC_BASE_URL;
  delete process.env.AGORA_WEBHOOK_SECRET;

  // Guessing codes is rate limited per client address.
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    statuses.push((await codeRoute.POST(request('/api/progress/code', { body: { code: '33333-33333' }, headers: { 'x-forwarded-for': `203.0.113.${store === 'file' ? 7 : 8}` } }))).status);
  }
  assert.deepEqual(statuses, [...Array(10).fill(404), 429, 429]);
  await resetProgressStore();
  console.log(`Progress API passed with the ${store} store: create, read, session report, completion, code, coach tools, conversation webhook, invite history, reset, bad input and rate limit.`);
}

async function main() {
  await verifyStores();
  verifyRules();
  verifyPromptAndTools();
  await verifyRoutes('file');
  await verifyRoutes('sqlite');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
