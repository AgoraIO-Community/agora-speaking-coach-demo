import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRACTICE_LANGUAGES } from '../lib/lessons';
import { Agent } from 'agora-agents';
import { NextRequest } from 'next/server';
import { getScenarioTools } from '../lib/agent-tools';
import { getScenarioConfig, getScenarioPrompt } from '../lib/agent-config';
import { getScenarioPresentation } from '../lib/presentation';

async function main() {
  const config = getScenarioConfig();
  assert.equal(getScenarioPresentation().id, config.id);
  assert.deepEqual(getScenarioTools(), []);
  assert.match(getScenarioPrompt(), /conversation-only|No external tools/);
  const landing = fs.readFileSync('components/LandingPage.tsx', 'utf8');
  assert.doesNotMatch(landing, /api\/scenarios|shopping_session_id|event_session_id|followUpApi|useShopping|useFollowUps/);

  process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
  process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';
  const { POST } = await import('../app/api/invite-agent/route');
  const originalCreate = Agent.prototype.createSession;
  const originalOrigin = process.env.TOP_TEN_SCENARIO_TOOL_BASE_URL;
  let captured: Agent | null = null;
  let sessionOptions: unknown;
  let starts = 0;
  Agent.prototype.createSession = (function (this: Agent, options: unknown) {
    captured = this;
    sessionOptions = options;
    return { start: async () => { starts += 1; return 'conversation-only-agent'; } };
  }) as unknown as typeof Agent.prototype.createSession;
  try {
    for (const { id, voice } of [{ id: undefined, voice: 'Spanish_SereneWoman' }, ...PRACTICE_LANGUAGES]) {
      const origin = id ? 'https://legacy-tools.example.test' : undefined;
      if (origin) process.env.TOP_TEN_SCENARIO_TOOL_BASE_URL = origin;
      else delete process.env.TOP_TEN_SCENARIO_TOOL_BASE_URL;
      const response = await POST(new NextRequest('http://localhost/api/invite-agent', {
        method: 'POST',
        body: JSON.stringify({ requester_id: 'voice-user', channel_name: 'voice-only-channel', practice_language: id }),
      }));
      const result = await response.json();
      assert.equal(response.status, 200, 'A voice conversation must start without a business session: ' + JSON.stringify(result));
      assert.equal(result.agent_id, 'conversation-only-agent');
      const actual = captured as unknown as Agent;
      assert.equal(actual.advancedFeatures?.enable_rtm, true);
      assert.equal(actual.advancedFeatures?.enable_tools, false);
      assert.deepEqual(actual.llm?.tools ?? [], []);
      // History is capped on the model config; the Agent-level option is deprecated and ignored when both are set.
      assert.equal(actual.llm?.max_history, 50);
      assert.equal(actual.maxHistory, undefined);
      assert.deepEqual((sessionOptions as { remoteUids: string[] }).remoteUids, ['voice-user']);
      assert.equal(actual.instructions, getScenarioPrompt(config.id, id));
      assert.equal((actual.tts?.params?.voice_setting as { voice_id?: string } | undefined)?.voice_id, voice);
    }
    const unsupported = await POST(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST',
      body: JSON.stringify({ requester_id: 'voice-user', channel_name: 'voice-only-channel', practice_language: 'zz' }),
    }));
    assert.equal(unsupported.status, 400);
    assert.equal(starts, PRACTICE_LANGUAGES.length + 1);
    // A valid lesson_id selects that lesson's prompt; an unknown one is rejected before any start.
    const lessonStart = await POST(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST',
      body: JSON.stringify({ requester_id: 'voice-user', channel_name: 'voice-only-channel', practice_language: 'ko', lesson_id: 'order-a-meal' }),
    }));
    assert.equal(lessonStart.status, 200);
    assert.equal((captured as unknown as Agent).instructions, getScenarioPrompt(config.id, 'ko', 'order-a-meal'));
    assert.notEqual(getScenarioPrompt(config.id, 'ko', 'order-a-meal'), getScenarioPrompt(config.id, 'ko'));
    const unknownLesson = await POST(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST',
      body: JSON.stringify({ requester_id: 'voice-user', channel_name: 'voice-only-channel', practice_language: 'ko', lesson_id: 'not-a-lesson' }),
    }));
    assert.equal(unknownLesson.status, 400);
    assert.equal(starts, PRACTICE_LANGUAGES.length + 2);
  } finally {
    Agent.prototype.createSession = originalCreate;
    if (originalOrigin === undefined) delete process.env.TOP_TEN_SCENARIO_TOOL_BASE_URL;
    else process.env.TOP_TEN_SCENARIO_TOOL_BASE_URL = originalOrigin;
  }
  console.log('Conversation-only startup, disabled tools and business-free page passed: ' + config.id);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
