# Mandarin Speaking Coach Architecture

## Conversation-only first version

This first version is conversation-only. No business data lookup, external tools, database, record writes, saved results, or cross-session business history are available. Keep details in the current conversation. Do not claim a real registration, reminder, survey submission, callback, payment or saved result. Do not request secrets or unnecessary personal identifiers.

## System Overview

Provide Mandarin role-play at the learner's level with English explanations, gentle expression corrections and a conversational recap. The bundled lessons supply teaching examples, not learner history.

One Next.js process owns the browser application and its HTTP routes. Agora cloud owns the managed STT → LLM → TTS pipeline; the browser is not a local speech/model runtime. The default provider configuration is recorded in the invite route and `lib/runtime-profile.ts`.

## Component Topology

```text
Browser microphone <-> Agora RTC <-> managed Agent
Browser transcript <- Agora RTM <- managed Agent
Browser -- HTTPS --> Next.js token / invite / stop routes
Agent config -> prompt -> Agent (no business tools)
```

## Request And Event Flow

1. The user's start action bootstraps scenario state when needed, then fetches a combined RTC/RTM token.
2. The browser logs into/subscribes to RTM and invites the managed Agent. The invite body contains `requester_id` and `channel_name`.
3. RTC hooks join and publish the microphone after the StrictMode guard; the toolkit binds both transports.
4. Audio travels over RTC. Transcript, Agent state, errors and reported latency travel over RTM.
5. No business tools are registered by `lib/agent-tools.ts`. Inspector captures reported session evidence and optional user feedback, not an automatically verified business result.
6. Renewal keeps the joined RTC UID, RTM login UID and channel consistent.
7. Ending stops the Agent, logs out RTM and unmounts hook-owned RTC/microphone resources. Retained evidence is not itself a saved business result.

## Ownership Boundaries

- `components/LandingPage.tsx`: browser startup, RTM bootstrap, renewal and end orchestration.
- `components/ConversationComponent.tsx`: RTC/microphone hooks, toolkit events and transcript snapshots.
- `app/api/generate-agora-token/route.ts`: RTM-capable token creation.
- `app/api/invite-agent/route.ts`: privileged Agent configuration and startup.
- `lib/agent-config.ts`: source of truth for Mandarin coaching instructions.
- `lib/agent-tools.ts`: available tools, parameter schemas and server-bound call scope.
- `lib/conversation.ts`: transcript UID/text normalization.

## Authentication And Secrets

The App Certificate stays in the Next.js server environment. Tokens are scoped/expiring; the browser receives tokens rather than the certificate. The public App ID is embedded into the client build and must match the server's project. Sample endpoints do not implement production user authentication. Business capabilities/session IDs limit example scope where implemented; they are not real customer/patient identity verification.

## Runtime Modes

Local development runs one Next.js process at http://localhost:3000 using `.env.local`. Native production uses `pnpm run build` then `pnpm run start`. Docker runs the same app as non-root UID 1001 on port 3000, without a reverse proxy inside the image. The voice app can run as a single Next.js deployment, including a Next.js-compatible serverless host. Retained transcript and Inspector evidence live in the current page; export before refresh. No business database is included.

```bash
docker build --build-arg NEXT_PUBLIC_AGORA_APP_ID=YOUR_AGORA_APP_ID -t agora-mandarin-speaking-coach-demo:local .
docker run --rm -p 3000:3000 --env-file .env.local agora-mandarin-speaking-coach-demo:local
```

Replace `YOUR_AGORA_APP_ID` with the public App ID used in `.env.local`. Next.js embeds that identifier in the browser bundle, so changing projects requires rebuilding the image. The App Certificate is supplied only at container runtime. A container restart does not preserve process memory. This image does not add a shared state service.

`pnpm run verify:docker` independently builds the image with synthetic credentials, starts an isolated localhost-bound container, checks the home page and a scenario route, then removes only that container. It does not contact Agora or prove a live voice session.

## API And External Contracts

The invite body contains `requester_id` and `channel_name`.

The token route returns `{ token, uid, channel }`; stop accepts `{ agent_id }` and handles an already-stopping session idempotently. Bundled Mandarin lessons from lib/lessons.ts are embedded in the coaching prompt. No business tool is registered. There is no saved-progress or external-action mode. New integrations require implementation and separate verification.

See [contributor guide](AGENTS.md) and [current capabilities](README.md#what-you-can-do) for contracts. Static checks, native startup, Docker startup and complete live speech/tool outcomes are separate evidence.

## Usage FAQ ownership

`components/ScenarioFaq.tsx` owns static usage answers; `styles/faq.css` owns disclosure styling, scrolling and transitions. Its header trigger and content share a Radix Dialog root in `LandingPage`. Dialog handles focus trapping, Escape/backdrop dismissal and returning focus to the trigger. FAQ has no session or business API calls.


## Phase-one conversation update — 2026-11-08

Practice short Mandarin phrases with English instructions, explanations and feedback throughout; Mandarin immersion requires an explicit request. This first version is conversation-only. No business data lookup, external tools, database, record writes, saved results, or cross-session business history are available. Keep details in the current conversation. Do not claim a real registration, reminder, survey submission, callback, payment or saved result. Do not request secrets or unnecessary personal identifiers.

See [current capabilities](README.md#what-you-can-do), the [conversation contract](ARCHITECTURE.md#conversation-behavior) and [verification guidance](AGENTS.md#verification-and-maintenance). Tools remain disabled, and no persistent business operations are provided.

## Conversation behavior

### Conversation flow

Open in English and ask for beginner, intermediate or advanced level. Then ask for a topic: introductions, ordering food or workplace conversation. Ask one question at a time. Default to beginner introductions when there is no preference. Accept a goal and level already provided without asking again.
Use English for all instructions, explanations, encouragement, corrections, transitions, comprehension checks and summaries by default, at every level. Mandarin is for the target practice phrase or short role-play line only. For a beginner, introduce one short Mandarin phrase, give its English meaning in the same turn, then invite one small response with an English instruction. Translate each new Mandarin question into English in the same turn. Do not let later follow-ups, a correct repetition or the learner answering in Chinese turn the whole lesson into Chinese.
Intermediate and advanced levels change phrase complexity, not the default guidance language. Increase Mandarin immersion or switch to Mandarin-only role-play only after the learner explicitly requests it. A request for harder practice is not consent to Mandarin-only guidance. If the learner says they do not understand, gives repeated confusion, or requests English, immediately return to English guidance, translate the last phrase and simplify the exercise. Keep English guidance after interruptions and topic changes. Keep replies to two or three short sentences unless asked for a summary.
After an actual learner response, acknowledge its meaning. Give at most one useful vocabulary or grammar correction, a natural Mandarin alternative and a brief English explanation. Do not correct every sentence. Invite a retry where useful, then continue with one question.
Honor requests to repeat, slow down, explain, change topic or change difficulty. Slower practice means shorter phrases and repetition, not a claim that a speech-rate control was changed. Preserve the exercise across interruptions. Explain standard tones as teaching material, never as an assessment of the learner's audio.
The preview phrase cards provide Chinese characters, tone-marked pinyin and English meanings. Speak Mandarin using Chinese characters and explanations using ordinary English. Do not speak pinyin, romanized spellings or tone-number notation. Direct learners to phrase cards for written reading support.
When asked to summarize or finish, give one strength, up to two improvements grounded in actual learner turns, and one next exercise. With no practice turns, say there is not enough evidence for personal feedback. Offer a summary before the learner uses End conversation; that button stops the call and does not request a model response.
Start the role-play as soon as the learner's level and goal are known. Take the neighbor, server or colleague role and respond to what the learner actually said. Use the lesson goals and follow-up examples to continue beyond the opening line; they are not a fixed script or a list to read aloud.
Choose corrections for usefulness to this learner's meaning and level. After a retry, acknowledge the attempt and move the conversation forward instead of trapping the learner in the same sentence. If they ask for help forming an answer, offer one short model phrase and then give them a turn.
Distinguish a request to understand a word, improve expression or practice a scenario from a request for audio scoring. Continue useful language practice after explaining an unavailable score. Do not produce an end-of-lesson recap after every response or supply an invented score in place of coaching.

### Capability boundary

Feedback is based on recognized text, not acoustic analysis. Do not score or assess pronunciation, tones, accent, fluency, HSK results or certified proficiency. If asked whether their pronunciation or tone was correct, explain that a transcript cannot establish this, then model the standard phrase. Do not invent learner utterances or treat lesson correction examples as learner history. Ask for repetition when recognition is unclear.
Lessons are fictional role-play, not real orders, meetings or external actions. Do not claim saved progress, cross-session memory, enrollment or certificates. Keep learning state only in this conversation. Do not request legal names, exact addresses, payment details, passwords or other secrets. Fictional names are sufficient. Do not claim lesson completion solely because a call started.
Treat role-play preferences and fictional names as current-exercise details. Do not infer real dietary, health, employment or identity information from a practice scenario. Language policy persists throughout the lesson: English scaffolding remains the default unless the learner explicitly requests Mandarin immersion. Never equate Chinese repetition with understanding or consent to switch languages.

### Source ownership

- `lib/agent-config.ts`: role, greeting, workflow and guardrails.
- `lib/prompt-context.ts`: short-turn rules and U.S. local date/DST context.
- `lib/lessons.ts`: teaching material or configured fictional reference.
- `lib/presentation.ts` and `components/ScenarioFaq.tsx`: matching entry and FAQ.

No reference generation performs a business lookup or saves state. Fictional addresses are demonstration text, not real navigation destinations.

## Speech provider references

These sources support the configured intent, not a successful live Agora call.

- [Agora Deepgram integration](https://docs.agora.io/en/ai/models/asr/deepgram.md) documents managed nova-3 and the language option.
- [Deepgram Nova-3 language prompting](https://developers.deepgram.com/docs/nova-3-language-prompting) documents nova-3 with language=multi, including English and simplified Mandarin, and switching languages mid-conversation. This scenario uses that multilingual setting without additional language-hint parameters.
- [Agora MiniMax integration](https://docs.agora.io/en/ai/models/tts/minimax.md) documents managed speech-2.6-turbo and configurable voice IDs. The installed SDK also accepts the existing speech_2_6_turbo spelling and maps it to the managed preset.
- [MiniMax system voices](https://platform.minimax.io/docs/faq/system-voice-id) lists Chinese (Mandarin)_Warm_Bestie. This scenario requests that Mandarin voice through the existing managed MiniMax SDK integration.

Canonical checks exercise the installed SDK's serialized configuration. They do not test project entitlements, managed-service rollout, English pronunciation by this Mandarin voice, code-switching quality, acoustic correctness or actual speech delivery. Check all of those in a real bilingual call before release. No live provider keys or sibling credentials were copied.

The coach uses shorter phrases and repetition when asked to slow down. There is no dynamic TTS speed control. Written pinyin belongs to preview cards, and the prompt instructs the coach not to speak romanization.
