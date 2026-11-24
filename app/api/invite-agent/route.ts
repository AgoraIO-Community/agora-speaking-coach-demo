import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agents';
import { ConvoAITokenBuilder } from 'agora-token';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID, TOKEN_LIFETIME_SECONDS } from '@/lib/agora';
import { DEFAULT_LESSON_ID, DEFAULT_PRACTICE_LANGUAGE, getPracticeLanguage, isLessonId, isPracticeLanguage } from '@/lib/lessons';
import { RUNTIME_PROFILE } from '@/lib/runtime-profile';
import { getScenarioConfig, getScenarioPrompt } from '@/lib/agent-config';
import { getScenarioTools } from '@/lib/agent-tools';
import { learnerIdFrom, setLearnerCookie } from '@/lib/progress/http';
import { applyStart, createLearner, getCoachToolBaseUrl, getLearnerHistory, loadLearner, signToolToken } from '@/lib/progress/service';
import { getProgressStore } from '@/lib/progress/store';
import type { LearnerRecord } from '@/lib/progress/types';

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, practice_language, lesson_id } = body;
    const language = practice_language === undefined ? DEFAULT_PRACTICE_LANGUAGE : practice_language;
    if (!isPracticeLanguage(language)) {
      return NextResponse.json({ error: 'Unsupported practice_language' }, { status: 400 });
    }
    const lessonId = lesson_id === undefined ? DEFAULT_LESSON_ID : lesson_id;
    if (!isLessonId(lessonId)) {
      return NextResponse.json({ error: 'Unsupported lesson_id' }, { status: 400 });
    }

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 1b. Saved progress ---

    // A broken COACH_TOOL_BASE_URL is a configuration error and fails loudly.
    const toolBaseUrl = getCoachToolBaseUrl();
    // The progress store must never block a practice session: on failure the
    // coach simply starts without history and without tools.
    let learner: LearnerRecord | null = null;
    let history: string | null = null;
    try {
      const store = await getProgressStore();
      learner = (await loadLearner(store, learnerIdFrom(request))) ?? createLearner();
      history = getLearnerHistory(learner, language, lessonId);
      applyStart(learner, language, lessonId);
      await store.put(learner);
    } catch (error) {
      learner = null;
      history = null;
      console.error('Progress unavailable at session start:', error instanceof Error ? error.message : 'unknown error');
    }
    // Coach tools need a public URL and a learner to write to. The token binds
    // tool calls to this learner and lesson for slightly longer than a session.
    const scenarioTools = toolBaseUrl && learner
      ? getScenarioTools({
          baseUrl: toolBaseUrl,
          token: signToolToken({ learnerId: learner.id, language, lessonId, expiresAt: Date.now() + 15 * 60 * 1000 }),
        })
      : getScenarioTools();
    const promptContext = { history, tools: scenarioTools.length > 0 };

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const scenario = getScenarioConfig(language, lessonId, promptContext);
    // The explicit builder avoids the SDK 2.14 / agora-token 2.0.7
    // positional-argument mismatch that otherwise creates a one-second token.
    const token = ConvoAITokenBuilder.buildToken(
      appId, appCertificate, channel_name, agentUid,
      TOKEN_LIFETIME_SECONDS, TOKEN_LIFETIME_SECONDS,
    );
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
      authToken: token,
    });

    // Pipeline: Deepgram (reseller) STT → OpenAI (reseller) LLM → MiniMax (reseller) TTS.
    // Omit vendor API keys for supported models — AgentKit infers reseller presets on start (see Agora Console / billing).
    const agent = new Agent({
      client,
      instructions: getScenarioPrompt(scenario.id, language, lessonId, promptContext),
      greeting: scenario.greeting,
      failureMessage: 'Please wait a moment.',
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // ms of speech before interruption triggers
              prefix_padding_ms: 300, // audio captured before speech is detected
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 1200, // ms of silence before turn ends
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // Tools are enabled only when COACH_TOOL_BASE_URL is set (coach tool mode).
      advancedFeatures: { enable_rtm: true, enable_tools: scenarioTools.length > 0 },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: RUNTIME_PROFILE.recognition.model,
          language: RUNTIME_PROFILE.recognition.language,
        }),
        // BYOK: uncomment the following block and set NEXT_DEEPGRAM_API_KEY
        // new DeepgramSTT({
        //   apiKey: requireEnv('NEXT_DEEPGRAM_API_KEY'),
        //   model: 'nova-3',
        //   language: 'en',
        // }),
      )
      .withLlm(
        new OpenAI({
          model: RUNTIME_PROFILE.reasoning.model,
          greetingMessage: scenario.greeting,
          failureMessage: 'Please wait a moment.',
          maxHistory: 100,
          tools: scenarioTools.length > 0 ? scenarioTools : undefined,
          params: {
            max_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
          },
        }),
        // BYOK: uncomment the following block and set NEXT_LLM_API_KEY and NEXT_LLM_URL
        // new OpenAI({
        //   apiKey: requireEnv('NEXT_LLM_API_KEY'),
        //   url: requireEnv('NEXT_LLM_URL'),
        //   model: 'gpt-4o-mini',
        //   greetingMessage: scenario.greeting,
        //   failureMessage: 'Please wait a moment.',
        //   maxHistory: 100,
        //   maxTokens: 1024,
        //   temperature: 0.7,
        //   topP: 0.95,
        // }),
      )
      .withTts(
        new MiniMaxTTS({
          model: RUNTIME_PROFILE.synthesis.model,
          voiceId: getPracticeLanguage(language).voice,
        }),
        // BYOK — ElevenLabs (set NEXT_ELEVENLABS_API_KEY; optional NEXT_ELEVENLABS_VOICE_ID)
        // new (await import('agora-agents')).ElevenLabsTTS({
        //   key: requireEnv('NEXT_ELEVENLABS_API_KEY'),
        //   modelId: 'eleven_flash_v2_5',
        //   voiceId: process.env.NEXT_ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB',
        //   sampleRate: 24000,
        // }),
      );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      token,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: TOKEN_LIFETIME_SECONDS,
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();

    const response = NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
    if (learner) setLearnerCookie(response, learner.id);
    return response;
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
