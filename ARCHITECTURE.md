# Speaking Coach Architecture

## Conversation-only first version

This first version is conversation-only. No business data lookup, external tools, database, record writes, saved results, or cross-session business history are available. Keep details in the current conversation. Do not claim a real registration, reminder, survey submission, callback, payment or saved result. Do not request secrets or unnecessary personal identifiers.

## Session time limit

LandingPage enforces a ten-minute browser session deadline from successful startup. It reuses the manual stop flow, checks wall time every second and on focus/visibility changes, and retries failed stops every five seconds. Successful stop retains the transcript and shows a timeout notice; starting again resets the deadline. Effect cleanup removes the timer/listeners. This is not a server-side usage cap: closed pages, suspended devices and network failures can delay Agent shutdown.

The conversation header shows a small, muted countdown (10:00 left) immediately before the connection status. The last minute is highlighted, with an automatic-stop notice for screen readers. At the deadline the timer stays at 00:00 until stopping succeeds. Screen readers do not announce every tick.

## System Overview

Teach one selected lesson from a fixed beginner curriculum in the selected language, with English explanations, gentle expression corrections, an objective check and a conversational recap. The bundled lessons supply teaching material, not learner history.

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

The invite route accepts an optional `practice_language` of `es`, `fr`, `de`, `pt`, `ja` or `ko`; other values return 400. Omitting it selects Spanish. Each language is one pack in `PRACTICE_LANGUAGES` (`lib/lessons.ts`): name, native name, MiniMax voice, optional romanization system and the target-language side of every curriculum lesson. Registering a pack adds the language to the picker, lesson chooser, phrasebook, prompt, greeting and request validation. The same choice controls the phrasebook, greeting, coaching instructions and MiniMax voice for the session.

The route also accepts an optional `lesson_id` from the curriculum (`introduce-yourself`, `talk-with-a-colleague`, `order-a-meal`, `ask-for-the-check`); unknown values return 400 and omitting it selects the first lesson.

### Curriculum

`lib/curriculum/skeleton.ts` holds the shared English side as data: level → units → lessons, each lesson with an id, title, can-do objective, U.S. fictional setting, five vocabulary meanings, a four-line model dialogue and two practice questions. Each `lib/curriculum/<language>.ts` pack supplies the target-language side of every lesson in the same order, plus one grammar or usage point with examples and two common-error fixtures. `lessons` is typed as a record over every lesson id, so a pack that misses a lesson does not compile. `lib/lessons.ts` registers the packs and merges skeleton and pack (`getLesson`, `getLessons`, `getCurriculum`, `getLessonContext`). The first version ships one level with two units of two lessons; more levels, units or lessons are added in the skeleton and packs without component or route changes.

Lesson objectives are original can-do statements written in the style of level A1 of the Council of Europe's [Common European Framework of Reference for Languages (CEFR)](https://www.coe.int/en/web/common-european-framework-reference-languages). The framework organizes lessons only: the coach never assigns, infers or certifies a learner's level. All lesson content is original and machine-authored; it has not had native-speaker review.

Japanese and Korean items carry a romanized reading aid (Hepburn; Revised Romanization of Korean). Readings are shown under the native script in the lesson chooser, Phrasebook and practice summary, and are not sent to the coach.

Only the selected lesson is injected into the coaching prompt, together with the title and objective of the next lesson. The landing-page lesson chooser is real session state: the selected `lesson_id` is sent with the start request. After a session the ended screen shows a practice summary built from data already in the browser (language, lesson, lesson vocabulary and the count of learner turns in the retained transcript). It does not generate corrections or scores and is not saved.

The token route returns `{ token, uid, channel }`; stop accepts `{ agent_id }` and handles an already-stopping session idempotently. The selected lesson from lib/lessons.ts is embedded in the coaching prompt. No business tool is registered. There is no saved-progress or external-action mode. New integrations require implementation and separate verification.

See [contributor guide](AGENTS.md) and [current capabilities](README.md#what-you-can-do) for contracts. Static checks, native startup, Docker startup and complete live speech/tool outcomes are separate evidence.

## Usage FAQ ownership

`components/ScenarioFaq.tsx` owns static usage answers; `styles/faq.css` owns disclosure styling, scrolling and transitions. Its footer trigger (`components/ScenarioFooter.tsx`) and content share a Radix Dialog root in `LandingPage` that wraps the header, workspace and footer. The header keeps the scenario identity, Phrasebook and the Build Now call to action; the footer holds the technology list, FAQ and Inspector and renders in every page state. On the landing page the language picker and Start practice sit beside the conversation preview at 1024px and wider, and stack below that. Dialog handles focus trapping, Escape/backdrop dismissal and returning focus to the trigger. FAQ has no session or business API calls.


<a id="conversation-behavior"></a>

## Scenario behavior — 2026-11-18

Practice Spanish, French, German, Portuguese, Japanese or Korean with English instructions, explanations and feedback. Ask explicitly for immersion in the selected language.

### Conversation flow

The learner chooses the lesson on the page before the call, so the coach does not ask for a level or topic first. It follows five steps: introduce the objective and a first phrase; build the target vocabulary one item at a time with the usage point; role-play the lesson setting using the lesson questions; check the objective with one short task without a model to copy; then offer more practice or the next lesson, which is chosen on the page before a new call. Ask one question at a time and use standard expressions appropriate for the selected language; explain regional alternatives as alternatives, not errors.
Use English for instructions, explanations, encouragement, corrections, transitions and summaries by default. The selected language is for a short target phrase or role-play line. Translate each new target-language phrase or question into English in the same turn. A correct repetition, an answer in the selected language or a request for harder practice does not switch all guidance to that language.
Switch to target-language-only role-play only after an explicit request for immersion. If the learner says they do not understand or requests English, immediately return to English guidance, translate the last phrase and simplify it. Maintain this policy across interruptions and lesson steps. Keep turns to two or three short sentences unless asked for a summary.
After an actual learner response, acknowledge its meaning and give at most one useful vocabulary or grammar correction, a natural alternative in the selected language and a brief English explanation. The common errors in the lesson material are teaching fixtures; do not treat them as learner history. If recognition is unclear, ask for repetition before correcting. Offer a short retry when helpful, then move the conversation forward rather than repeating the same drill indefinitely.
Respond to what the learner actually said; the model dialogue is an example, not a script to read aloud. Accept requests to repeat, slow down, change topic, simplify or increase difficulty: simplify with shorter phrases and repetition, increase difficulty with longer answers on the same objective. Slowing down means shorter phrases and repetition, not a claim that TTS speed was changed. A request for a different lesson or language is answered by explaining that it is chosen on the page before a new call.
The Phrasebook contains the selected lesson's written expressions with normal accents and punctuation, English meanings and, for non-Latin scripts, a romanized reading aid. Speak the target-language expression normally; do not read romanization, field names, spelling guides or punctuation aloud.
When asked to finish, give one strength, up to two improvements grounded in actual learner turns, whether the lesson objective was demonstrated in this call, and one next exercise. Without practice turns, explain there is not enough evidence for personal feedback. Do not invent a score, CEFR level or lesson completion. A request for pronunciation evaluation cannot be answered from a transcript: explain that limitation briefly, model the standard phrase and continue useful vocabulary or grammar practice. Offer a summary before End conversation, which stops the call without asking for a model response.

### Capability boundary

Feedback is based on recognized text, not acoustic analysis. Do not score or assess pronunciation, accent, fluency or certified proficiency, and do not infer a CEFR level. Do not invent learner utterances or treat lesson examples as actual history. Ask for repetition when recognition is unclear. Role-play is fictional and does not place orders, take payments, schedule meetings or save progress. Keep exercise details only in this conversation; do not infer real personal attributes from fictional practice. English guidance is the default unless immersion in the selected language is explicitly requested; a request for harder practice is not consent to immersion. Do not request legal names, addresses, payment details or secrets.

### Source ownership

`lib/agent-config.ts` owns the workflow and greeting. `lib/presentation.ts` and `components/ScenarioFaq.tsx` own matching public copy. `lib/lessons.ts` and `lib/curriculum/` own the curriculum and teaching material.

### Speech configuration

The existing Deepgram nova-3 multilingual setting (`multi`) is retained for English and target-language practice. MiniMax uses `Spanish_SereneWoman`, `French_MovieLeadFemale`, `German_SweetLady`, `Portuguese_GentleTeacher`, `Japanese_KindLady` or `Korean_SoothingLady` according to the selected language. A new language must be covered by Deepgram nova-3 `multi` and have a MiniMax system voice. [Agora MiniMax integration](https://docs.agora.io/en/ai/models/tts/minimax.md) documents configurable voice IDs; [MiniMax system voices](https://platform.minimax.io/docs/faq/system-voice-id) lists these voices. The installed SDK serialization is checked locally. Actual managed-service availability, code switching between English and the selected language and speech quality require a real bilingual call; these are not established by local tests. Shorter phrases do not change TTS speed. Conversation history is capped at 100 messages through `maxHistory` on the model config in `app/api/invite-agent/route.ts`; the Agent-level option is deprecated in the SDK and is not set.

## Token lifetime compatibility

Browser RTC/RTM tokens and server-side Agent/REST tokens use the shared ten-minute `TOKEN_LIFETIME_SECONDS` duration. Token builders take durations, not Unix expiry timestamps. Keep the App Certificate and ConvoAI-capable REST tokens on the server.

The Agent start/stop routes explicitly mint tokens with `ConvoAITokenBuilder.buildToken` and pass the supported SDK `authToken` / session `token` options. This avoids the `agora-agents` 2.14.0 / `agora-token` 2.0.7 positional-argument mismatch: the SDK helper otherwise treats publisher role `1` as a one-second token lifetime. Do not patch installed dependencies or add blanket overrides. `verify:api` exercises the real SDK serialization with intercepted network transport, decodes and verifies actual signed tokens, and checks a 600-second lifetime for browser, REST start, Agent RTC/RTM and REST stop tokens. Revisit the explicit-token compatibility path only after an upstream SDK correction passes this regression and live acceptance.

## Lint dependency security compatibility

The registry audit reports GHSA-g3hv-75wg-m249 in minimatch 10.2.6, including the latest typescript-estree 8.72.2 dependency range. A parent-scoped pnpm override selects minimatch 11.0.1 only for `@typescript-eslint/typescript-estree>minimatch`; it does not replace unrelated consumers. Node.js 24 satisfies its runtime requirement, and the caller uses the retained CommonJS `minimatch` function with `dot: true`. Recheck and remove this compatibility override when the upstream dependency range includes a patched version. Run the complete verification suite and an official-registry audit after lockfile updates.
