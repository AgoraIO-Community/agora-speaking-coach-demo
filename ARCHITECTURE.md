# Speaking Coach Architecture

## Scope

This version saves practice history and nothing else. Lessons practiced or marked complete, session dates and learner turn counts are stored per anonymous learner through a pluggable progress store. Corrections are stored only in coach tool mode, and conversation text only when conversation logging is configured; audio is never stored. No business data lookup or other external action is available. Do not claim a real registration, reminder, survey submission, callback or payment. Do not request secrets or unnecessary personal identifiers.

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
Agent config + learner history -> prompt -> Agent (coach tools only when COACH_PUBLIC_BASE_URL is set)
```

## Request And Event Flow

1. The user's start action bootstraps scenario state when needed, then fetches a combined RTC/RTM token.
2. The browser logs into/subscribes to RTM and invites the managed Agent. The invite body contains `requester_id` and `channel_name`, the selected `practice_language` and `lesson_id`, and an optional `learner_name` for lessons that take one.
3. RTC hooks join and publish the microphone after the StrictMode guard; the toolkit binds both transports.
4. Audio travels over RTC. Transcript, Agent state, errors and reported latency travel over RTM.
5. `lib/agent-tools.ts` registers no tools unless `COACH_PUBLIC_BASE_URL` is set; then it registers the two coach progress tools. Inspector captures reported session evidence and optional user feedback, not an automatically verified business result.
6. Renewal keeps the joined RTC UID, RTM login UID and channel consistent.
7. Ending stops the Agent, logs out RTM and unmounts hook-owned RTC/microphone resources. The page then reports the finished session to `/api/progress`. Inspector evidence is not itself a saved result.

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

The route accepts an optional `learner_name`: a first name or nickname the learner typed for a lesson flagged `takesLearnerName` (currently `introduce-yourself`). A value that is not a string returns 400. `sanitizeLearnerName` in `lib/lessons.ts` normalizes it to NFC, keeps only letters, combining marks, digits, spaces and the name punctuation `'`, `’`, `.`, `-`, `·` and `・`, collapses whitespace, trims, cuts it to 40 characters and treats a result without a letter or digit as no name. Line breaks, control characters, quotes and other symbols therefore never reach the prompt. The name is ignored for lessons without the flag. With a name, the prompt gains one section, `# Learner-supplied practice name`, that quotes the name, labels it as learner-supplied data rather than an instruction, says the lesson material already shows it, and tells the coach to teach the introduction with it; the greeting becomes "Hi, <name>!". Without a name the prompt and greeting are unchanged. The name is not transliterated in code; the coach may offer a natural rendering in the practice language.

### Curriculum

`lib/curriculum/skeleton.ts` holds the shared English side as data: level → units → lessons, each lesson with an id, title, can-do objective, U.S. fictional setting, five vocabulary meanings, a four-line model dialogue and two practice questions. A lesson can also set `takesLearnerName: true` with a `sampleName`; the landing page then shows the optional practice-name input and the invite route accepts `learner_name` for it. Such a lesson writes the placeholder `{name}` instead of a literal name in the skeleton and in every pack (target text, reading aids, English meanings and error fixtures), and each pack declares its own `sampleName` (for example `アレックス` with the reading `Arekkusu`). `getLesson(language, lessonId, learnerName)` fills the placeholder with the sanitized name exactly as typed, or with the sample name when none is given. The lesson chooser cards update as the learner types; the Phrasebook, the practice summary and the prompt material read the same merged lesson, so the coach receives the phrases the learner sees. Names are never transliterated, so a Latin-script name appears as typed inside Japanese and Korean sentences and their reading aids. Pack phrasing must be correct for any name: the Korean pack uses `제 이름은 {name}입니다` because `예요`/`이에요` depends on the name's final sound. Each `lib/curriculum/<language>.ts` pack supplies the target-language side of every lesson in the same order, plus one grammar or usage point with examples and two common-error fixtures. `lessons` is typed as a record over every lesson id, so a pack that misses a lesson does not compile. `lib/lessons.ts` registers the packs and merges skeleton and pack (`getLesson`, `getLessons`, `getCurriculum`, `getLessonContext`). The first version ships one level with two units of two lessons; more levels, units or lessons are added in the skeleton and packs without component or route changes.

Lesson objectives are original can-do statements written in the style of level A1 of the Council of Europe's [Common European Framework of Reference for Languages (CEFR)](https://www.coe.int/en/web/common-european-framework-reference-languages). The framework organizes lessons only: the coach never assigns, infers or certifies a learner's level. All lesson content is original and machine-authored; it has not had native-speaker review.

Japanese and Korean items carry a romanized reading aid (Hepburn; Revised Romanization of Korean). Readings are shown under the native script in the lesson chooser, Phrasebook and practice summary, and are not sent to the coach.

Only the selected lesson is injected into the coaching prompt, together with the title and objective of the next lesson. The landing-page lesson chooser is real session state: the selected `lesson_id` is sent with the start request. After a session the ended screen shows a practice summary built from data already in the browser (language, lesson, lesson vocabulary and the count of learner turns in the retained transcript). It does not generate corrections or scores and is not saved.

The token route returns `{ token, uid, channel }`; stop accepts `{ agent_id }` and handles an already-stopping session idempotently. The selected lesson from lib/lessons.ts is embedded in the coaching prompt. Saved progress and its optional tool and webhook modes are described in [Saved progress and conversation logging](#saved-progress-and-conversation-logging). There is no other external-action mode. New integrations require implementation and separate verification.

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
The coach receives recognized text, never audio, and applies an ordered check before any correction: text that matches the requested phrase apart from spelling, accent marks, capitalization, punctuation or an English look-alike for a short word counts as correct; text that only sounds like the phrase is treated as a probable recognition error, so the attempt is accepted and the lesson moves on; an empty or unrelated turn gets one request to repeat, never two in a row; only a genuine word-choice or grammar error in clearly recognized words is corrected. Probable recognition errors are never quoted back as the learner's words, never described as a pronunciation problem, never recorded as corrections and never listed in the recap. After an actual, clearly recognized learner response, acknowledge its meaning and give at most one useful vocabulary or grammar correction, a natural alternative in the selected language and a brief English explanation. The common errors in the lesson material are teaching fixtures; do not treat them as learner history. If recognition is unclear, ask for repetition before correcting. Offer a short retry when helpful, then move the conversation forward rather than repeating the same drill indefinitely.
Respond to what the learner actually said; the model dialogue is an example, not a script to read aloud. Accept requests to repeat, slow down, change topic, simplify or increase difficulty: simplify with shorter phrases and repetition, increase difficulty with longer answers on the same objective. Slowing down means shorter phrases and repetition, not a claim that TTS speed was changed. A request for a different lesson or language is answered by explaining that it is chosen on the page before a new call.
The Phrasebook contains the selected lesson's written expressions with normal accents and punctuation, English meanings and, for non-Latin scripts, a romanized reading aid. Speak the target-language expression normally; do not read romanization, field names, spelling guides or punctuation aloud.
When asked to finish, give one strength, up to two improvements grounded in actual learner turns, whether the lesson objective was demonstrated in this call, and one next exercise. Without practice turns, explain there is not enough evidence for personal feedback. Do not invent a score, CEFR level or lesson completion. A request for pronunciation evaluation cannot be answered from a transcript: explain that limitation briefly, model the standard phrase and continue useful vocabulary or grammar practice. Offer a summary before End conversation, which stops the call without asking for a model response.

### Capability boundary

Feedback is based on recognized text, not acoustic analysis. Do not score or assess pronunciation, accent, fluency or certified proficiency, and do not infer a CEFR level. Do not invent learner utterances or treat lesson examples as actual history. Ask for repetition when recognition is unclear. Role-play is fictional and does not place orders, take payments or schedule meetings. Saved progress is practice history only (lessons, dates, turn counts and recorded corrections); it is never a score or a proficiency level. Do not infer real personal attributes from fictional practice. English guidance is the default unless immersion in the selected language is explicitly requested; a request for harder practice is not consent to immersion. Do not request legal names, addresses, payment details or secrets.

### Source ownership

`lib/agent-config.ts` owns the workflow and greeting. `lib/presentation.ts` and `components/ScenarioFaq.tsx` own matching public copy; `lib/presentation.ts` also owns the transcript speaker labels ("Coach" and "You"). `lib/lessons.ts` and `lib/curriculum/` own the curriculum and teaching material.

### Speech configuration

Speech recognition uses Agora ARES, which Agora manages without a vendor key. Each session sends two candidate languages, English for guidance plus the pack's `recognitionLocale` (`es-ES`, `fr-FR`, `de-DE`, `pt-PT`, `ja-JP` or `ko-KR`), as one comma-separated `asr.language` such as `en-US,es-ES`, and the selected lesson's target phrases as `asr.keywords`. `getRecognitionTerms` in `lib/lessons.ts` derives the keywords from the lesson's vocabulary, model dialogue, questions and grammar examples, with the learner's practice name where the lesson has one; error fixtures are never keywords. agora-agents 2.14 writes a single language tag, so `withRecognitionLanguages` in `lib/runtime-profile.ts` completes the start request through the client's `fetch` option; 2.15 accepts a list in `turnDetection.language`, which replaces that function after an upgrade. Several candidate languages require VAD turn detection, which this app already uses. Turn detection keeps 800 ms of audio from before detected speech (`prefix_padding_ms`, Agora's documented default; previously 300) so the start of a short answer is not clipped; silence and interruption durations are unchanged.

This default replaced Deepgram nova-3 `multi` after measurement, because `multi` transcribed short beginner phrases as similar-sounding words (for example "Mediano ..." or "Miyamo ..." in place of "Me llamo ..."). The measurement used synthetic speech only: macOS text-to-speech files played as a fake microphone into a muted headless browser that joined a real session, with the recognized text read from Agora's conversation history. Each Spanish session spoke one English sentence, "Hola.", "Me llamo \<name\>." (the lesson's "My name is" phrase with a practice name), "Vivo en Boston." and a second English sentence, in three voice conditions (a Spanish voice, an English voice reading the Spanish text, and an English voice reading a phonetic respelling):

| Configuration | Sessions | Spanish phrases exact | "Me llamo \<name\>." exact | English exact |
| --- | --- | --- | --- | --- |
| ARES `en-US,es-ES` (with or without keywords) | 34 | 102 of 102 | 34 of 34 | 68 of 68 |
| Deepgram `multi` (previous default) | 70 | 47 of 210 | 0 of 70 | 138 of 140 |
| Deepgram `multi` + `language_hint` as one string | 10 | 8 of 30 | 0 of 10 | 20 of 20 |
| Deepgram `multi` + `endpointing` 100 | 10 | 7 of 30 | 0 of 10 | 20 of 20 |
| Deepgram `multi` + `language_hint` as a list | 10 | 0 of 30, every turn empty | 0 of 10 | 0 of 20 |
| Deepgram `language: es` | 10 | 20 of 30 | 0 of 10 | 4 of 20 |
| ARES `en-US` only | 4 | 3 of 12 | 0 of 4 | 8 of 8 |

Deepgram `keyterm` on `multi` changed nothing in any accepted form (one word, `%20`-joined words, a list, or repeated parameters), and a `keyterm` string containing plain spaces returned empty text for every turn. `language_hint` sent as a list is what produced the earlier empty transcripts: it returned empty text for all 50 turns in ten sessions with no error, while `endpointing` 100 alone recognized normally. With the applied configuration and native synthetic voices, French, German and Portuguese phrases were exact in 18 of 18 turns, Korean in 6 of 6 and Japanese in 4 of 6 (the name was written in katakana); English stayed exact in every session. Keywords changed nothing for Spanish but fixed the practice name in French and Korean (4 of 4 against 0 of 4 without them), and deliberately wrong phrases ("Yo vivir en Boston.") were still transcribed as spoken. Keywords bias the recognizer toward the lesson phrases, so a transcript can show the expected phrase when the learner was only close to it; ARES also wrote the phonetic English-voice attempts as standard Spanish. Recognized text is therefore not evidence of pronunciation. Reply latency was similar (median about 2.1 s from end of speech with either recognizer), but 10 of 334 ARES turns took over 4 s, nine of them in one two-minute cluster of four concurrent sessions, against 2 of 440 Deepgram turns; the cause was not established. None of this measures a real accented learner or a real microphone and room.

Server-only variables change recognition without a code change. `COACH_STT_VENDOR=deepgram` returns to Deepgram nova-3 `multi`, and `COACH_STT_KEYWORDS=off` stops sending keywords to ARES. The remaining two apply to the Deepgram fallback only: `COACH_STT_LANGUAGE_HINT` (`single` sends the pack's code as one string; `on` sends the list form that returns empty text and should not be used) and `COACH_STT_ENDPOINTING` (Deepgram `endpointing` in milliseconds). A pack whose Deepgram code differs from its `id` sets `recognitionCode`. The Inspector shows the default recognizer from `lib/runtime-profile.ts`, not an override.

MiniMax uses `Spanish_SereneWoman`, `French_MovieLeadFemale`, `German_SweetLady`, `Portuguese_GentleTeacher`, `Japanese_KindLady` or `Korean_SoothingLady` according to the selected language. A new language must have an ARES locale that the installed SDK accepts for interaction and a MiniMax system voice. [Agora MiniMax integration](https://docs.agora.io/en/ai/models/tts/minimax.md) documents configurable voice IDs; [MiniMax system voices](https://platform.minimax.io/docs/faq/system-voice-id) lists these voices. The installed SDK serialization is checked locally. Actual managed-service availability, code switching between English and the selected language and speech quality require a real bilingual call; these are not established by local tests. Shorter phrases do not change TTS speed. Conversation history is capped at 100 messages through `maxHistory` on the model config in `app/api/invite-agent/route.ts`; the Agent-level option is deprecated in the SDK and is not set.

## Token lifetime compatibility

Browser RTC/RTM tokens and server-side Agent/REST tokens use the shared ten-minute `TOKEN_LIFETIME_SECONDS` duration. Token builders take durations, not Unix expiry timestamps. Keep the App Certificate and ConvoAI-capable REST tokens on the server.

The Agent start/stop routes explicitly mint tokens with `ConvoAITokenBuilder.buildToken` and pass the supported SDK `authToken` / session `token` options. This avoids the `agora-agents` 2.14.0 / `agora-token` 2.0.7 positional-argument mismatch: the SDK helper otherwise treats publisher role `1` as a one-second token lifetime. Do not patch installed dependencies or add blanket overrides. `verify:api` exercises the real SDK serialization with intercepted network transport, decodes and verifies actual signed tokens, and checks a 600-second lifetime for browser, REST start, Agent RTC/RTM and REST stop tokens. Revisit the explicit-token compatibility path only after an upstream SDK correction passes this regression and live acceptance.

## Lint dependency security compatibility

The registry audit reports GHSA-g3hv-75wg-m249 in minimatch 10.2.6, including the latest typescript-estree 8.72.2 dependency range. A parent-scoped pnpm override selects minimatch 11.0.1 only for `@typescript-eslint/typescript-estree>minimatch`; it does not replace unrelated consumers. Node.js 24 satisfies its runtime requirement, and the caller uses the retained CommonJS `minimatch` function with `dot: true`. Recheck and remove this compatibility override when the upstream dependency range includes a patched version. Run the complete verification suite and an official-registry audit after lockfile updates.

## Saved progress and conversation logging

### Data model and adapters

`lib/progress/types.ts` defines one document per learner: `languages` (per lesson: started, last practiced, session count, completed at/by), `sessions` (last 50), `corrections` (last 30, tool mode only), `agents` (started agents, logging only) and `conversations` (logging only). The `ProgressStore` contract is `get`, `put`, `delete`, `findByCode`, `linkAgent` and `findByAgent`; `put` replaces the document, last write wins.

`PROGRESS_STORE` selects the adapter in `lib/progress/store.ts`:

| Value | Adapter | Persists on | Verified by |
|---|---|---|---|
| `file` (default) | One JSON file in `PROGRESS_DATA_DIR` (default `.scenario-data`), atomic writes, mode 600 | Local disk, a Docker volume mounted at `/app/.scenario-data` | Contract checks and local runs |
| `sqlite` | `node:sqlite` database file in the same directory (no native dependency) | Same as `file` | Contract checks and local runs |
| `postgres` | `DATABASE_URL` connection string for Neon or Supabase, `postgres` driver loaded only when selected, tables created on first use | Hosted database; required on serverless hosts such as Vercel | Not run against a live database |

An unknown store or a missing `DATABASE_URL` fails with a clear error. A store failure never blocks a session: the invite route starts the coach without history or tools, and the progress API answers 503.

### Identity

A random learner id is created with the first save or session start and kept in an httpOnly, SameSite=Lax cookie (Secure in production builds, so plain-HTTP access works only on `localhost`). Each learner also has a 10-character code from a 30-character alphabet (about 49 bits). Entering it on another device switches that browser to the same learner; redeeming is rate limited per client address in memory, per server process. Both the cookie and the code are bearer secrets. No name or contact detail is collected for identity. The optional practice name for the introduction lesson lives in page state, is sent only with the invite request and is not written to the learner document, agent links or server logs. Where conversation logging is enabled, the stored conversation text contains whatever was spoken in the call, which can include that name. `DELETE /api/progress` removes the learner's document and agent links.

### Completion modes

- **Browser mode** (`COACH_PUBLIC_BASE_URL` unset): the page reports each finished session (idempotent by session id) and the learner marks the lesson complete on the ended screen. The UI updates optimistically from `lib/progress/client.ts`, caches the last view in `localStorage` (never the code) and shows an inline retry when a save fails.
- **Coach tool mode** (`COACH_PUBLIC_BASE_URL` set): the invite route enables tools and registers two Agora inline REST tools, `record_correction` and `record_objective_result`. Agora's cloud calls `POST /api/progress/coach` with a per-session bearer token: an HMAC-SHA256 token bound to learner, language, lesson and a 15-minute expiry, keyed from the App Certificate. The body never selects the learner or lesson.

### Prompt history

At session start `getLearnerHistory` adds a short factual section for the selected language: lessons marked complete, lessons practiced, the last finished session, the status of today's lesson, up to three recorded corrections and, when a conversation was logged, up to three of the learner's final turns from it. Without saved practice the prompt says so and forbids inventing history. Identifiers never enter the prompt.

### Conversation logging through Agora's webhook

Stored conversation text comes from Agora's servers, not from the browser. The live transcript in the UI still uses real-time messages and is display only.

```text
invite (logging on) -> agent starts -> link agent id to learner and lesson
session ends -> Agora POSTs eventType 103 to /api/agora-webhook
  -> verify Agora-Signature-V2 -> find learner by agent id -> store turns -> 200
```

- **Enabled** only when `COACH_PUBLIC_BASE_URL` and `AGORA_WEBHOOK_SECRET` are both set; otherwise the route answers 404 and no agent link is saved.
- **Signature**: HMAC-SHA256 of the raw request body with the webhook secret, hex, compared in constant time against the `Agora-Signature-V2` header. Unsigned or mismatched requests get 401.
- **Events**: only `eventType` 103 (agent history) is stored. Other events are acknowledged with 200 and ignored.
- **Idempotency**: one conversation per agent id; a retried or replayed event answers `duplicate` and changes nothing. A store failure answers 503 so the event can be delivered again.
- **Content limits**: Agora sends the agent's stored dialogue, capped by `llm.max_history` (set to 100 here), so the earliest turns of a very long session can be missing. The app keeps at most 200 turns of 2,000 characters per conversation and marks cut records as truncated.
- **Retention**: the newest 20 conversations per learner, none older than 90 days (pruned on write). Reset deletes them.
- **Privacy**: recognized speech can contain anything a learner says. Conversation text never goes to the browser view or server logs. Audio is never stored. Provider-side retention at Agora and the speech and model vendors is outside this source.

What was verified against Agora's documentation: the notification envelope (`noticeId`, `productId`, `eventType`, `notifyMs`, `payload`), the `Agora-Signature` (HMAC-SHA1) and `Agora-Signature-V2` (HMAC-SHA256) headers, the 103 payload (`agent_id`, `start_ts`, `stop_ts`, `contents[]` of `role` and `content`, optional `labels`), the `max_history` cap, the 10-second response expectation and that retries can happen. Not verified: a live delivery (no public URL was available), the exact retry schedule, whether the Console health check is signed, and that the CLI event key `agent-memory` is the 103 event. Sources: [Handle webhook](https://docs.agora.io/en/ai/build/handle-runtime-events/webhooks), [Notification event types](https://docs.agora.io/en/ai/reference/event-types), [Retrieve conversation history](https://docs.agora.io/en/ai/build/handle-runtime-events/retrieve-session-history).

These endpoints are sample-grade: no accounts, in-memory rate limits and last-write-wins documents. They are not production authentication or abuse controls.
