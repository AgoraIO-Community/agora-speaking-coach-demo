# Speaking Coach Architecture

## Conversation-only first version

This first version is conversation-only. No business data lookup, external tools, database, record writes, saved results, or cross-session business history are available. Keep details in the current conversation. Do not claim a real registration, reminder, survey submission, callback, payment or saved result. Do not request secrets or unnecessary personal identifiers.

## Session time limit

LandingPage enforces a ten-minute browser session deadline from successful startup. It reuses the manual stop flow, checks wall time every second and on focus/visibility changes, and retries failed stops every five seconds. Successful stop retains the transcript and shows a timeout notice; starting again resets the deadline. Effect cleanup removes the timer/listeners. This is not a server-side usage cap: closed pages, suspended devices and network failures can delay Agent shutdown.

The conversation header shows a small, muted countdown (10:00 left) immediately before the connection status. The last minute is highlighted, with an automatic-stop notice for screen readers. At the deadline the timer stays at 00:00 until stopping succeeds. Screen readers do not announce every tick.

## System Overview

Provide role-play in the selected language at the learner's level with English explanations, gentle expression corrections and a conversational recap. The bundled lessons supply teaching examples, not learner history.

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
- `lib/agent-config.ts`: source of truth for multilingual coaching instructions.
- `lib/agent-tools.ts`: available tools, parameter schemas and server-bound call scope.
- `lib/conversation.ts`: transcript UID/text normalization.

## Authentication And Secrets

The App Certificate stays in the Next.js server environment. Tokens are scoped/expiring; the browser receives tokens rather than the certificate. The public App ID is embedded into the client build and must match the server's project. Sample endpoints do not implement production user authentication. Business capabilities/session IDs limit example scope where implemented; they are not real customer/patient identity verification.

## Runtime Modes

Local development runs one Next.js process at http://localhost:3000 using `.env.local`. Native production uses `pnpm run build` then `pnpm run start`. Docker runs the same app as non-root UID 1001 on port 3000, without a reverse proxy inside the image. The voice app can run as a single Next.js deployment, including a Next.js-compatible serverless host. Retained transcript and Inspector evidence live in the current page; export before refresh. No business database is included.

```bash
docker build --build-arg NEXT_PUBLIC_AGORA_APP_ID=YOUR_AGORA_APP_ID -t agora-speaking-coach-demo:local .
docker run --rm -p 3000:3000 --env-file .env.local agora-speaking-coach-demo:local
```

Replace `YOUR_AGORA_APP_ID` with the public App ID used in `.env.local`. Next.js embeds that identifier in the browser bundle, so changing projects requires rebuilding the image. The App Certificate is supplied only at container runtime. A container restart does not preserve process memory. This image does not add a shared state service.

`pnpm run verify:docker` independently builds the image with synthetic credentials, starts an isolated localhost-bound container, checks the home page and a scenario route, then removes only that container. It does not contact Agora or prove a live voice session.

## API And External Contracts

The invite body contains `requester_id` and `channel_name`.

The invite route accepts an optional `practice_language` of `es`, `fr` or `de`. Omitting it selects Spanish. The same choice controls the phrasebook, greeting, coaching instructions and MiniMax voice for the session.

The token route returns `{ token, uid, channel }`; stop accepts `{ agent_id }` and handles an already-stopping session idempotently. Selected-language lessons from lib/lessons.ts are embedded in the coaching prompt. No business tool is registered. There is no saved-progress or external-action mode. New integrations require implementation and separate verification.

See [contributor guide](AGENTS.md) and [current capabilities](README.md#what-you-can-do) for contracts. Static checks, native startup, Docker startup and complete live speech/tool outcomes are separate evidence.

## Usage FAQ ownership

`components/ScenarioFaq.tsx` owns static usage answers; `styles/faq.css` owns disclosure styling, scrolling and transitions. Its header trigger and content share a Radix Dialog root in `LandingPage`. Dialog handles focus trapping, Escape/backdrop dismissal and returning focus to the trigger. FAQ has no session or business API calls.


<a id="conversation-behavior"></a>

## Scenario behavior — 2026-11-18

Practice Spanish, French or German with English instructions, explanations and feedback. Ask explicitly for immersion in the selected language.

### Conversation flow

Open in English and ask for beginner, intermediate or advanced level, then a topic: introductions, ordering food or workplace conversation. Ask one question at a time, reuse any level and goal already provided, and default to beginner introductions without a preference. Use standard expressions appropriate for the selected language; explain regional alternatives as alternatives, not errors.
Use English for instructions, explanations, encouragement, corrections, transitions and summaries by default at every level. The selected language is for a short target phrase or role-play line. For beginners, give one short phrase in the selected language and its English meaning in the same turn, then invite one small response. Translate each new target-language question into English in the same turn. A correct repetition, an answer in Spanish or a request for harder practice does not switch all guidance to Spanish.
Switch to target-language-only role-play only after an explicit request for immersion. If the learner says they do not understand or requests English, immediately return to English guidance, translate the last phrase and simplify it. Maintain this policy across interruptions and topic changes. Keep turns to two or three short sentences unless asked for a summary.
After an actual learner response, acknowledge its meaning and give at most one useful vocabulary or grammar correction, a natural alternative in the selected language and a brief English explanation. Do not treat lesson correction examples as learner history. If recognition is unclear, ask for repetition before correcting. Offer a short retry when helpful, then move the conversation forward rather than repeating the same drill indefinitely.
Start the neighbor, server or colleague role-play once the goal and level are known. Respond to what the learner actually said; lesson goals and follow-ups are examples, not a script to read aloud. Accept requests to repeat, slow down, change topic, simplify or increase difficulty. Slowing down means shorter phrases and repetition, not a claim that TTS speed was changed.
The Phrasebook contains written expressions in the selected language with normal accents and punctuation plus English meanings. Speak the target-language expression normally; do not read field names, spelling guides or punctuation aloud. The topic tabs are reading aids and do not control the call; the learner must tell the coach to change topic.
When asked to finish, give one strength, up to two improvements grounded in actual learner turns, and one next exercise. Without practice turns, explain there is not enough evidence for personal feedback. Do not invent a score, CEFR level or lesson completion. A request for pronunciation evaluation cannot be answered from a transcript: explain that limitation briefly, model the standard phrase and continue useful vocabulary or grammar practice. Offer a summary before End conversation, which stops the call without asking for a model response.

### Capability boundary

Feedback is based on recognized text, not acoustic analysis. Do not score or assess pronunciation, accent, fluency or certified proficiency, and do not infer a CEFR level. Do not invent learner utterances or treat lesson examples as actual history. Ask for repetition when recognition is unclear. Role-play is fictional and does not place orders, schedule meetings or save progress. Keep exercise details only in this conversation; do not infer real personal attributes from fictional practice. English guidance is the default unless immersion in the selected language is explicitly requested; a request for harder practice is not consent to immersion. Do not request legal names, addresses, payment details or secrets.

### Source ownership

`lib/agent-config.ts` owns the workflow and greeting. `lib/presentation.ts` and `components/ScenarioFaq.tsx` own matching public copy. `lib/lessons.ts` owns teaching examples.

### Speech configuration

The existing Deepgram nova-3 multilingual setting (`multi`) is retained for English and target-language practice. MiniMax uses `Spanish_SereneWoman`, `French_MovieLeadFemale` or `German_SweetLady` according to the selected language. [Agora MiniMax integration](https://docs.agora.io/en/ai/models/tts/minimax.md) documents configurable voice IDs; [MiniMax system voices](https://platform.minimax.io/docs/faq/system-voice-id) lists these voices. The installed SDK serialization is checked locally. Actual managed-service availability, code switching between English and the selected language and speech quality require a real bilingual call; these are not established by local tests. Shorter phrases do not change TTS speed.

## Token lifetime compatibility

Browser RTC/RTM tokens and server-side Agent/REST tokens use the shared ten-minute `TOKEN_LIFETIME_SECONDS` duration. Token builders take durations, not Unix expiry timestamps. Keep the App Certificate and ConvoAI-capable REST tokens on the server.

The Agent start/stop routes explicitly mint tokens with `ConvoAITokenBuilder.buildToken` and pass the supported SDK `authToken` / session `token` options. This avoids the `agora-agents` 2.14.0 / `agora-token` 2.0.7 positional-argument mismatch: the SDK helper otherwise treats publisher role `1` as a one-second token lifetime. Do not patch installed dependencies or add blanket overrides. `verify:api` exercises the real SDK serialization with intercepted network transport, decodes and verifies actual signed tokens, and checks a 600-second lifetime for browser, REST start, Agent RTC/RTM and REST stop tokens. Revisit the explicit-token compatibility path only after an upstream SDK correction passes this regression and live acceptance.

## Lint dependency security compatibility

The registry audit reports GHSA-g3hv-75wg-m249 in minimatch 10.2.6, including the latest typescript-estree 8.72.2 dependency range. A parent-scoped pnpm override selects minimatch 11.0.1 only for `@typescript-eslint/typescript-estree>minimatch`; it does not replace unrelated consumers. Node.js 24 satisfies its runtime requirement, and the caller uses the retained CommonJS `minimatch` function with `dot: true`. Recheck and remove this compatibility override when the upstream dependency range includes a patched version. Run the complete verification suite and an official-registry audit after lockfile updates.
