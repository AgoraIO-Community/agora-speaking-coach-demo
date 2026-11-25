import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { AgoraClient, Agent } from 'agora-agents';
import { RtcTokenBuilder } from 'agora-token';
import { NextRequest } from 'next/server';

// Keep saved-progress writes from these checks out of the repository.
process.env.PROGRESS_STORE = 'file';
process.env.PROGRESS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-api-check-'));
delete process.env.COACH_PUBLIC_BASE_URL;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';

async function verifyGenerateAgoraTokenRoute() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=4321&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token should return 200',
    );
    assert(
      body.token === 'mock-rtc-rtm-token',
      'GET /api/generate-agora-token should return the built token',
    );
    assert(
      body.uid === '4321',
      'GET /api/generate-agora-token should preserve the requested uid',
    );
    assert(
      body.channel === 'test-channel',
      'GET /api/generate-agora-token should preserve the requested channel',
    );

    assert(
      Array.isArray(tokenBuilderArgs),
      'GET /api/generate-agora-token should call buildTokenWithRtm',
    );
    assert(
      tokenBuilderArgs?.[2] === 'test-channel',
      'buildTokenWithRtm should use the requested channel',
    );
    assert(
      tokenBuilderArgs?.[3] === '4321',
      'buildTokenWithRtm should receive the requested uid as account string',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyGenerateAgoraTokenReplacesZeroUid() {
  const { GET: generateAgoraToken } =
    await import('../app/api/generate-agora-token/route');
  const originalBuildTokenWithRtm = RtcTokenBuilder.buildTokenWithRtm;
  let tokenBuilderArgs: unknown[] | null = null;

  RtcTokenBuilder.buildTokenWithRtm = ((...args: unknown[]) => {
    tokenBuilderArgs = args;
    return 'mock-rtc-rtm-token';
  }) as typeof RtcTokenBuilder.buildTokenWithRtm;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/generate-agora-token?uid=0&channel=test-channel',
    );
    const response = await generateAgoraToken(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'GET /api/generate-agora-token?uid=0 should return 200',
    );
    assert(
      typeof body.uid === 'string' && body.uid !== '0',
      'GET /api/generate-agora-token?uid=0 should generate an RTM-safe uid',
    );
    assert(
      Array.isArray(tokenBuilderArgs) && tokenBuilderArgs[3] === body.uid,
      'buildTokenWithRtm should mint the token for the generated uid',
    );
  } finally {
    RtcTokenBuilder.buildTokenWithRtm = originalBuildTokenWithRtm;
  }
}

async function verifyInviteAgentValidation() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const request = new NextRequest('http://localhost:3000/api/invite-agent', {
    body: JSON.stringify({ channel_name: 'missing-requester' }),
    method: 'POST',
  });
  const response = await inviteAgent(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/invite-agent should reject missing fields',
  );
  assert(
    body.error === 'channel_name and requester_id are required',
    'POST /api/invite-agent should explain validation failure',
  );

  const badName = await inviteAgent(new NextRequest('http://localhost:3000/api/invite-agent', {
    body: JSON.stringify({ requester_id: 'user-4321', channel_name: 'test-channel', learner_name: 42 }),
    method: 'POST',
  }));
  assert(
    badName.status === 400 && (await getJson(badName)).error === 'learner_name must be a string',
    'POST /api/invite-agent should reject a learner_name that is not text',
  );
}

async function verifyInviteAgentSuccess() {
  const { POST: inviteAgent } = await import('../app/api/invite-agent/route');
  const originalCreateSession = Agent.prototype.createSession;
  let capturedSessionConfig: {
    channel?: string;
    agentUid?: string;
    remoteUids?: string[];
  } | null = null;

  Agent.prototype.createSession = ((sessionConfig: unknown) => {
    capturedSessionConfig = sessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };
    return {
      start: async () => 'mock-agent-id',
    };
  }) as unknown as typeof Agent.prototype.createSession;

  try {
    const request = new NextRequest('http://localhost:3000/api/invite-agent', {
      body: JSON.stringify({
        requester_id: 'user-4321',
        channel_name: 'test-channel',
      }),
      method: 'POST',
    });
    const response = await inviteAgent(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/invite-agent should return 200 on success',
    );
    assert(
      body.agent_id === 'mock-agent-id',
      'POST /api/invite-agent should return the started agent id',
    );
    assert(
      body.state === 'RUNNING',
      'POST /api/invite-agent should return RUNNING state',
    );
    assert(
      capturedSessionConfig !== null,
      'POST /api/invite-agent should call createSession',
    );
    const sessionConfig = capturedSessionConfig as {
      channel?: string;
      agentUid?: string;
      remoteUids?: string[];
    };

    assert(
      sessionConfig.channel === 'test-channel',
      'POST /api/invite-agent should pass the requested channel to createSession',
    );
    assert(
      sessionConfig.agentUid === '123456',
      'POST /api/invite-agent should use the shared default agent UID',
    );
    assert(
      JSON.stringify(sessionConfig.remoteUids) ===
        JSON.stringify(['user-4321']),
      'POST /api/invite-agent should scope the session to the requesting user',
    );
  } finally {
    Agent.prototype.createSession = originalCreateSession;
  }
}

async function verifyStopConversationValidation() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const request = new NextRequest(
    'http://localhost:3000/api/stop-conversation',
    {
      body: JSON.stringify({}),
      method: 'POST',
    },
  );
  const response = await stopConversation(request);
  const body = await getJson(response);

  assert(
    response.status === 400,
    'POST /api/stop-conversation should reject missing agent_id',
  );
  assert(
    body.error === 'agent_id is required',
    'POST /api/stop-conversation should explain validation failure',
  );
}

async function verifyStopConversationSuccess() {
  const { POST: stopConversation } =
    await import('../app/api/stop-conversation/route');
  const originalStopAgent = AgoraClient.prototype.stopAgent;
  let stoppedAgentId: string | null = null;

  AgoraClient.prototype.stopAgent = async function (
    this: AgoraClient,
    agentId: string,
  ) {
    stoppedAgentId = agentId;
  } as typeof AgoraClient.prototype.stopAgent;

  try {
    const request = new NextRequest(
      'http://localhost:3000/api/stop-conversation',
      {
        body: JSON.stringify({ agent_id: 'mock-agent-id' }),
        method: 'POST',
      },
    );
    const response = await stopConversation(request);
    const body = await getJson(response);

    assert(
      response.status === 200,
      'POST /api/stop-conversation should return 200 on success',
    );
    assert(
      body.success === true,
      'POST /api/stop-conversation should return success',
    );
    assert(
      stoppedAgentId === 'mock-agent-id',
      'POST /api/stop-conversation should call stopAgent with the requested agent id',
    );
  } finally {
    AgoraClient.prototype.stopAgent = originalStopAgent;
  }
}

async function verifyRealTokenLifetimes() {
  const require = createRequire(import.meta.url);
  const { AccessToken2 } = require('agora-token/src/AccessToken2') as {
    AccessToken2: new () => {
      from_string(value: string): boolean;
      verifySignature(certificate: string): boolean;
      issueTs: number;
      expire: number;
    };
  };
  const lifetimes: Record<string, number> = {};
  const inspect = (label: string, value: unknown) => {
    assert(typeof value === 'string' && value.length > 0, label + ': missing token');
    const parsed = new AccessToken2();
    assert(parsed.from_string(value), label + ': invalid token encoding');
    assert(parsed.verifySignature(process.env.NEXT_AGORA_APP_CERTIFICATE!), label + ': invalid signature');
    assert(Math.abs(parsed.issueTs - Math.floor(Date.now() / 1000)) <= 5, label + ': stale issue time');
    lifetimes[label] = parsed.expire;
  };
  const { GET } = await import('../app/api/generate-agora-token/route');
  const clientResponse = await GET(new NextRequest('http://localhost/api/generate-agora-token?uid=4321&channel=expiry-regression'));
  inspect('browser', (await getJson(clientResponse)).token);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname;
    const authorization = new Headers(init?.headers).get('Authorization');
    assert(typeof authorization === 'string' && authorization.startsWith('agora token='), 'SDK request must use server-only Agora token auth');
    inspect(path.endsWith('/join') ? 'start-rest' : 'stop-rest', authorization.slice('agora token='.length));
    if (path.endsWith('/join')) {
      const body = JSON.parse(String(init?.body)) as { properties: { token: string } };
      inspect('agent-rtc-rtm', body.properties.token);
      return Response.json({ agent_id: 'expiry-regression-agent', state: 'RUNNING' });
    }
    assert(path.endsWith('/leave'), 'Unexpected SDK network request in offline expiry regression: ' + path);
    return new Response(null, { status: 200 });
  };
  try {
    const { POST: invite } = await import('../app/api/invite-agent/route');
    const response = await invite(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST', body: JSON.stringify({ requester_id: '4321', channel_name: 'expiry-regression' }),
    }));
    assert(response.status === 200, 'Real SDK start serialization should succeed with an intercepted transport');
    const { POST: stop } = await import('../app/api/stop-conversation/route');
    const stopped = await stop(new Request('http://localhost/api/stop-conversation', {
      method: 'POST', body: JSON.stringify({ agent_id: 'expiry-regression-agent' }),
    }));
    assert(stopped.status === 200, 'Real SDK stop serialization should succeed with an intercepted transport');
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log('Decoded real token lifetimes (seconds):', lifetimes);
  for (const label of ['browser', 'start-rest', 'agent-rtc-rtm', 'stop-rest']) {
    assert(lifetimes[label] === 600, label + ': token lifetime must be ten minutes, got ' + lifetimes[label]);
  }
}

// Captures the request body the installed SDK really sends to Agora's /join,
// with the network intercepted, for one practice language.
type StartProperties = {
  asr: { vendor: string; language?: string; keywords?: string[]; params: Record<string, unknown> };
  turn_detection: {
    config: {
      speech_threshold: number;
      start_of_speech: { mode: string; vad_config: Record<string, number> };
      end_of_speech: { mode: string; vad_config: Record<string, number> };
    };
  };
};
const RECOGNITION_ENV = ['COACH_STT_VENDOR', 'COACH_STT_KEYWORDS', 'COACH_STT_LANGUAGE_HINT', 'COACH_STT_ENDPOINTING'] as const;

async function captureStartProperties(practiceLanguage: string, env: Partial<Record<(typeof RECOGNITION_ENV)[number], string>> = {}, extra: Record<string, string> = {}) {
  const originalFetch = globalThis.fetch;
  const originalEnv = RECOGNITION_ENV.map((name) => process.env[name]);
  let properties: StartProperties | null = null;
  globalThis.fetch = async (input, init) => {
    const path = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname;
    assert(path.endsWith('/join'), 'Unexpected SDK network request in offline recognition check: ' + path);
    properties = (JSON.parse(String(init?.body)) as { properties: StartProperties }).properties;
    return Response.json({ agent_id: 'recognition-check-agent', state: 'RUNNING' });
  };
  for (const name of RECOGNITION_ENV) {
    if (env[name] === undefined) delete process.env[name];
    else process.env[name] = env[name];
  }
  try {
    const { POST: invite } = await import('../app/api/invite-agent/route');
    const response = await invite(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST',
      body: JSON.stringify({ requester_id: '4321', channel_name: 'recognition-check', practice_language: practiceLanguage, ...extra }),
    }));
    assert(response.status === 200, 'Offline start should succeed for ' + practiceLanguage);
  } finally {
    globalThis.fetch = originalFetch;
    RECOGNITION_ENV.forEach((name, index) => {
      if (originalEnv[index] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[index];
    });
  }
  assert(properties !== null, 'The start request was not captured for ' + practiceLanguage);
  const captured = properties as StartProperties;
  if (process.env.PRINT_START_CONFIG) {
    console.log(practiceLanguage, JSON.stringify(env), JSON.stringify({ asr: captured.asr, turn_detection: captured.turn_detection }));
  }
  return captured;
}

async function verifyRecognitionSerialization() {
  const { PRACTICE_LANGUAGES } = await import('../lib/lessons');
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  const { getRecognitionTerms } = await import('../lib/lessons');
  for (const { id, recognitionLocale } of PRACTICE_LANGUAGES) {
    // Default: Agora ARES with English and the practice language as candidates
    // and the default lesson's phrases as keywords; no vendor parameters.
    const { asr, turn_detection: turnDetection } = await captureStartProperties(id);
    const language = 'en-US,' + recognitionLocale;
    assert(
      same(asr, { vendor: 'ares', keywords: getRecognitionTerms(id), language }),
      id + ': the default start sends ARES with lesson keywords and both candidate languages, nothing else',
    );
    const plain = await captureStartProperties(id, { COACH_STT_KEYWORDS: 'off' });
    assert(same(plain.asr, { vendor: 'ares', language }), id + ': COACH_STT_KEYWORDS=off sends no keywords');
    const { start_of_speech: start, end_of_speech: end } = turnDetection.config;
    assert(start.mode === 'vad' && end.mode === 'vad', id + ': several candidate languages require VAD turn detection');
    assert(start.vad_config.prefix_padding_ms === 800, id + ': prefix padding');
    assert(start.vad_config.interrupt_duration_ms === 160, id + ': interrupt duration is unchanged');
    assert(end.vad_config.silence_duration_ms === 1200, id + ': silence duration is unchanged');

    // Fallback: plain nova-3 multi, no hint and no endpointing, single interaction language.
    const fallback = await captureStartProperties(id, { COACH_STT_VENDOR: 'deepgram' });
    assert(fallback.asr.vendor === 'deepgram' && fallback.asr.language === 'en-US', id + ': Deepgram fallback vendor');
    assert(same(fallback.asr.params, { language: 'multi' }), id + ': the Deepgram fallback sends plain multi and nothing else');

    // Fallback opt-in: hint list (a JSON array) and endpointing.
    const hinted = await captureStartProperties(id, { COACH_STT_VENDOR: 'deepgram', COACH_STT_LANGUAGE_HINT: 'on', COACH_STT_ENDPOINTING: '100' });
    assert(
      same(hinted.asr.params, { endpointing: 100, language_hint: ['en', id], language: 'multi' }),
      id + ': opt-in sends multi, a language_hint array of English and the practice language, and endpointing',
    );
    const single = await captureStartProperties(id, { COACH_STT_VENDOR: 'deepgram', COACH_STT_LANGUAGE_HINT: 'single' });
    assert(same(single.asr.params, { language_hint: id, language: 'multi' }), id + ': single sends one hint string');
    // The Deepgram tuning variables never reach ARES.
    const ignored = await captureStartProperties(id, { COACH_STT_LANGUAGE_HINT: 'on', COACH_STT_ENDPOINTING: '100' });
    assert(same(ignored.asr, asr), id + ': Deepgram tuning variables do not change the ARES request');
  }
  // Keywords follow the selected lesson and show the typed practice name.
  const named = await captureStartProperties('es', {}, { lesson_id: 'introduce-yourself', learner_name: ' Zuzanna ' });
  assert(same(named.asr.keywords, getRecognitionTerms('es', 'introduce-yourself', 'Zuzanna')), 'Keywords use the sanitized practice name');
  assert(named.asr.keywords?.includes('Me llamo Zuzanna') && !JSON.stringify(named.asr.keywords).includes('Alex'), 'The sample name is replaced in keywords');
  const meal = await captureStartProperties('es', {}, { lesson_id: 'order-a-meal', learner_name: 'Zuzanna' });
  assert(same(meal.asr.keywords, getRecognitionTerms('es', 'order-a-meal')), 'Keywords come from the selected lesson only');
  assert(!JSON.stringify(meal.asr.keywords).includes('Zuzanna'), 'A lesson without a practice name sends no name');
  for (const value of ['off', 'OFF', '']) {
    const { asr } = await captureStartProperties('es', { COACH_STT_VENDOR: 'deepgram', COACH_STT_LANGUAGE_HINT: value });
    assert(same(asr.params, { language: 'multi' }), 'COACH_STT_LANGUAGE_HINT=' + value + ' must omit language_hint');
  }
  for (const value of ['', 'ares', 'unknown']) {
    const { asr } = await captureStartProperties('es', { COACH_STT_VENDOR: value });
    assert(asr.vendor === 'ares' && asr.language === 'en-US,es-ES', 'COACH_STT_VENDOR=' + value + ' must use ARES');
  }
}

async function main() {
  await verifyRealTokenLifetimes();
  await verifyRecognitionSerialization();
  await verifyGenerateAgoraTokenRoute();
  await verifyGenerateAgoraTokenReplacesZeroUid();
  await verifyInviteAgentValidation();
  await verifyInviteAgentSuccess();
  await verifyStopConversationValidation();
  await verifyStopConversationSuccess();

  console.log('API contract checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
