# Agent Development Guide

## First-version scope

Practice Spanish, French, German, Portuguese, Japanese or Korean with English instructions, explanations and feedback. Ask explicitly for immersion in the selected language. The learner selects a language and one lesson from a fixed beginner curriculum on the page; the coach teaches that lesson toward its can-do objective.

Feedback is based on recognized text, not acoustic analysis. Do not score or assess pronunciation, accent, fluency or certified proficiency, and do not infer a CEFR level. Do not invent learner utterances or treat lesson examples as actual history. Ask for repetition when recognition is unclear. Role-play is fictional and does not place orders, take payments or schedule meetings. Saved progress is practice history only (lessons, dates, turn counts and recorded corrections); it is never a score or a proficiency level. Do not infer real personal attributes from fictional practice. English guidance is the default unless immersion in the selected language is explicitly requested; a request for harder practice is not consent to immersion. Do not request legal names, addresses, payment details or secrets.

This version saves practice history and nothing else. Lessons practiced or marked complete, session dates and learner turn counts are stored per anonymous learner through a pluggable progress store. Corrections are stored only in coach tool mode, and conversation text only when conversation logging is configured; audio is never stored. No business data lookup or other external action is available. See [Saved progress, public URL and conversation logging](#saved-progress-public-url-and-conversation-logging).

## Shared scenario UI requirements

1. **Open the main page directly**: show the scenario explanation and task-specific start action inline. Do not add an introductory dialog, automatic welcome overlay, or Preview first step. Connecting, errors and retry feedback stay inline. Loading the page must not start a session or request microphone access.
2. **Keep the public scenario identity visible**: the public scenario name and short purpose remain visible on desktop and mobile from first load and throughout the session. The header and main heading use the same public name. Keep internal numeric IDs out of visible page and Build copy. Activity status must not replace the scenario name.
3. **Use our UIkit components**: adopt actual component source and accompanying theme/styles from [shczhen/agent-ui](https://github.com/shczhen/agent-ui), connected to real session data and actions. Preserve source provenance and RTC/RTM ownership.

Inspect desktop/mobile direct entry, reload and inline startup failure/retry states. Confirm there is no introductory overlay and that the main start control directly starts the existing session flow. Inspect actual screenshots before acceptance. Inspector, Build and the coach phrasebook open only on explicit user actions.

The transcript is always visible during a session and on the ended screen; there is no hide/show control. For transcript changes, verify desktop/mobile live text growth, preserve deliberate history reading (new turns must not pull a reader back to the end) and verify that Scroll to end resumes following.

This direct-entry rule applies to the base template and all scenarios. It supersedes earlier introductory-dialog requirements and per-scenario exceptions. Keep this self-contained section synchronized with the workspace SCENARIO_UI_RULES.md.

## U.S. scenario content

Use a United States setting for fictional business examples, UI copy, Agent context and sample data. Use U.S. cities and addresses, American English (`en-US`), USD for configured prices, and U.S. local dates and times. Use an explicit IANA time zone and the date-correct UTC offset, including daylight saving time; keep data, prompts, tools, exports and UI labels consistent. Do not introduce East Asian locations, regional currencies or time zones into scenario examples. Keep fictional data clearly distinguished from live business facts. Preserve original source citations and third-party license attribution accurately.

## Repository language

Maintain `README.md` in English, `README.zh-CN.md` in Simplified Chinese, and `README.ja.md` in Japanese. These localized README files are an explicit exception to the English-only rule below. Keep all three READMEs aligned on features, setup, deployment, FAQ and limitations, with reciprocal language links. Documentation language does not change the application or Agent language.

Use English for documentation, code comments and interface labels. Target-language lesson text, coaching examples and transcript content are an intentional exception: expressions in the selected language and English meanings are required for this educational scenario.

## Start here

Read [README](README.md) for setup and deployment, [architecture](ARCHITECTURE.md) for ownership, [the public recipe](RECIPE.md) and [verification guidance](AGENTS.md#verification-and-maintenance) for behavior and evidence boundaries.

Use Node.js 24 from .nvmrc and pnpm 9.15.9. Install with pnpm install --frozen-lockfile. Copy env.local.example to .env.local only when absent; preserve existing credentials. Run pnpm run doctor, pnpm run dev and pnpm run verify. Docker checks use pnpm run verify:docker separately.

## Ownership and runtime contracts

- LandingPage owns token/invite bootstrap, RTM, renewal, stop and current-page state. ConversationComponent owns guarded RTC/toolkit initialization and transcripts.
- Preserve RtcTokenBuilder.buildTokenWithRtm, matching RTC/RTM identities and RTM readiness before RTC/toolkit mount.
- Keep the isReady StrictMode guard and stable RTC client ref. useJoin owns leave, the microphone hook owns track cleanup and usePublish owns publication. Never manually close hook-owned tracks or disable StrictMode.
- Remap the toolkit local uid=0 sentinel; keep interrupted turns. Preserve deliberate transcript history reading; the transcript stays visible, with no hide/show control. Transcript speaker labels come from `speakers` in `lib/presentation.ts` ("Coach" and "You").
- lib/agent-config.ts owns instructions and greeting; lib/prompt-context.ts owns concise conversation rules and business-local date/calendar context where present. lib/runtime-profile.ts owns non-secret provider defaults.
- lib/lessons.ts is the public entry for the curriculum: it registers the language packs in lib/curriculum/ and supplies the prompt material, the landing-page lesson chooser, the Phrasebook and the practice summary. The selected language and lesson are session state sent as `practice_language` and `lesson_id`; changing lesson or language mid-call is not supported.
- A lesson that practices the learner's own name sets `takesLearnerName: true` in `lib/curriculum/skeleton.ts`; never test for a lesson id in a component, route or prompt. For such a lesson the landing page shows one optional "Name to practice with" input (first name or nickname, never a legal name) above the start action, and sends it as `learner_name`. The invite route cleans it with `sanitizeLearnerName` (`lib/lessons.ts`), ignores it for other lessons, and passes it to `lib/agent-config.ts`, which adds a labelled learner-supplied-data section and uses it in the greeting. Keep it in page state only: do not write it to the progress store, agent links, learner history, logs or any other endpoint, and do not transliterate it in code. Such a lesson declares `sampleName` in the skeleton and in every language pack and writes `{name}` wherever the name appears (target text, reading aids, English meanings, error fixtures). `getLesson(language, lessonId, learnerName)` is the only place that fills the placeholder, with the sanitized name as typed or the sample name; the landing-page lesson cards, Phrasebook, practice summary and prompt material all read the lesson through it. Phrase such lessons so the grammar is correct for any name (for example Korean `입니다` rather than `예요`/`이에요`).
- Keep startup independent of the progress store: a store failure must never block a session; the coach then starts without history or tools. Business API routes are not provided.
- `lib/progress/` owns saved progress: `types.ts` (records, adapter contract, caps), `store.ts` (adapter selection), `service.ts` (identity, rules, tool token, prompt history), `conversations.ts` (webhook signature and conversation log), `view.ts` and `client.ts` (browser view and optimistic updates). `lib/agent-tools.ts` owns the coach tool definitions.
- NEXT_PUBLIC_AGORA_APP_ID is public and required at build/runtime. Keep NEXT_AGORA_APP_CERTIFICATE and optional vendor keys server-only. Never log, commit or screenshot credentials.
- Sample token/start/stop endpoints are not production login or abuse controls. Provider retention is external to this source. Keep missing measurements unknown and Inspector outcomes manual.
- Keep Inspector, Build, adopted UIkit source, source licenses and Docker support.

## multilingual coaching contract

Use lib/lessons.ts for the curriculum and prompt material. The shared English skeleton (level → units → lessons with can-do objective, setting, vocabulary, model dialogue and practice questions) lives in `lib/curriculum/skeleton.ts`; each practice language is one pack file in `lib/curriculum/` registered in `PRACTICE_LANGUAGES`. The landing-page picker, lesson chooser, phrasebook, prompt, greeting, voice and request validation derive from it, so add a language or lesson there rather than in components or routes, and keep every language at parity (`verify:scenario` checks this). Inject only the selected lesson into the prompt. Objectives are original CEFR A1-style can-do statements; the framework organizes lessons and is never used to assign or certify a learner level. Non-Latin scripts carry a romanized reading aid that is displayed but not sent to the coach. Keep the lesson flow (introduce, build, role-play, check, move on), in-lesson simplify/increase-difficulty adaptation, persistent English guidance unless immersion is explicitly requested, one-question turns, at most one useful expression correction and a recap grounded in real learner turns. Example corrections are teaching fixtures, not learner history. Model standard expressions in the selected language without claiming acoustic evaluation. No tools or saved progress are provided. The lesson is chosen on the page before the call; the coach does not ask for a level or topic first. The ended screen shows a practice summary built only from browser-held data (language, lesson, lesson vocabulary, learner turn count); it must not generate corrections or scores. It reports the finished session to the progress API and lets the learner mark the lesson complete; a failed save shows an inline retry and is never presented as saved. Ask for a recap before ending. Recognition uses Agora ARES by default with English plus the pack's `recognitionLocale` as candidate languages, the selected lesson's phrases from `getRecognitionTerms` as keywords (never literals in the route, never error fixtures) and `prefix_padding_ms` 800. `COACH_STT_VENDOR=deepgram` keeps the measured Deepgram nova-3 `multi` fallback and `COACH_STT_KEYWORDS=off` sends no keywords; `COACH_STT_LANGUAGE_HINT` and `COACH_STT_ENDPOINTING` are server-only, off by default and apply to that fallback only. Never send Deepgram `language_hint` as a list: it returned empty text for every learner turn. Change a recognition default only with a measured comparison that shows learner turns still carry recognized text, and record what was measured in `ARCHITECTURE.md` and `env.local.example`. A Deepgram code that differs from a pack's `id` belongs on the pack as `recognitionCode`. The prompt opens with "Reading learner turns": recognized text that only looks or sounds like the requested phrase is a probable recognition error, so the coach accepts the attempt and moves on, asks for a repeat at most once in a row, corrects only genuine word-choice or grammar errors in clearly recognized text, and never quotes, records or recaps a probable recognition error as a learner mistake. See [speech provider references](ARCHITECTURE.md#speech-configuration).

## Prompt behavior contract — 2026-11-05

Keep `lib/agent-config.ts` as the prompt entry point. Use `lib/lessons.ts` for public scenario material and `lib/prompt-context.ts` for concise conversation rules and business-local date/calendar context. Keep the source classification visible in the prompt: configured fictional business facts and static public references are not live customer records.

Answer supported questions and continue useful advice after identifying one unavailable action. Preserve one-question turns, corrected details, honest uncertainty and the scope boundary. The prompt states truthfully whether the coach has tools and whether this conversation's text is stored; keep those statements tied to the real configuration. Do not reactivate retired business fixtures or tools while changing a prompt. Keep README and architecture aligned with behavior changes; run `pnpm run verify` and report real-model/voice acceptance separately.

## Public presentation ownership

`lib/presentation.ts` owns the single public `name`, purpose and summary, and the transcript speaker labels (`speakers`: "Coach" for the agent, "You" for the learner) used by the live transcript, the ended-screen transcript and the Inspector evidence list. The header and main heading both render that name; `app/layout.tsx` derives browser metadata from it. There is no separate headline field. Internal IDs stay available for diagnostics and configuration, without being rendered as public identity text.

## Verification and maintenance

Run pnpm run verify for repository checks, lint, types, mocked API/startup, transcript/Inspector, scenario rules and production build. Keep synthetic checks, rendered UI, Docker and actual human speech evidence distinct.

Inspect actual desktop/mobile screenshots after visible changes, including direct entry and inline startup error/retry. Transcript changes also need live growth, paused history and Scroll to end checks.

Keep README, AGENTS, RECIPE and ARCHITECTURE aligned with behavior. Contributor guidance is consolidated here.

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance, version bumps), `test:` (test additions/changes), `docs:` (documentation)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `feat(api): add stop-conversation status flag`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"
- **PR number appended** — `feat: add feature (#123)`

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- **Examples:** `feat/agent-metrics`, `fix/transcript-uid`, `docs/progressive-disclosure`

### General rules

- **No AI tool names** — never mention claude, cursor, copilot, cody, aider, gemini, codex, chatgpt, or gpt-3/4 in commit messages or PR descriptions.
- **No Co-Authored-By trailers** — omit AI attribution lines.
- **No `--no-verify`** — let git hooks run normally.
- **No git config changes** — do not modify `user.name` or `user.email`.

Local implementation does not authorize a commit. A commit does not authorize a push or GitHub write; each requires explicit current-conversation authorization. Preserve unrelated local changes and never alter Git identity or bypass hooks.

## Usage FAQ contract

Keep Build Now as the single filled call to action at the upper-right of the header, with Phrasebook beside it; it is the only Build Now trigger in the app, so do not add one to the session controls or the ended screen. The session controls hold the microphone device menu, mute and End conversation only. Keep FAQ and Inspector in the page footer (`components/ScenarioFooter.tsx`) beside the technology list; the footer renders on the landing, in-session and ended states. On the landing page keep the language picker and Start practice beside the lesson chooser on wide screens and stacked on narrow ones; the lesson material scrolls inside its panel on wide screens so the page stays within the viewport. `components/ScenarioFaq.tsx` and `styles/faq.css` follow the Voice Shopping drawer pattern: closed on entry, right-side on desktop, full-width on mobile, internally scrollable, and keyboard accessible. Opening FAQ must not start a session or request microphone access. Keep answers consistent with this scenario’s conversation-only scope. Preserve the coach Phrasebook where present.


## Scenario update — 2026-11-18

Practice Spanish, French, German, Portuguese, Japanese or Korean with English instructions, explanations and feedback. Ask explicitly for immersion in the selected language. Follow the current lesson-driven workflow in `lib/agent-config.ts` and the curriculum in `lib/curriculum/`. Existing repository, package, recipe and internal identifiers are retained for entry compatibility; they are not public scenario labels.

## Typography

Use the installed Helvetica Neue/sans-serif fallback and keep the shared font tokens consistent with global/form-control styles. Do not bundle or download font assets. Preserve UI source attribution and other third-party notices. Check desktop/mobile rendering after typography changes.

## Session time limit

LandingPage owns the ten-minute browser deadline and reuses the guarded stop flow. Preserve wall-time checks on focus/visibility, five-second stop retries, cleanup, transcript retention and reset on restart. A failed stop must keep the session open with retry feedback. This is not a server-side usage cap.

The header countdown sits immediately before connection status in 12px muted text. Highlight the last minute with light gray (#D4D4D8); announce only the final-minute and expiry notices to screen readers.

## npm scaffold releases

The application remains private. In the upstream Community repository, `pnpm run npm:build` creates the separate public creator package and `pnpm run npm:test` tests the installed tarball offline. Generated projects omit `scripts/npm/`, those two npm scripts, the npm release workflow, the official production deployment workflow and maintainer-only release documentation. They retain application verification, general CI and Docker verification. See the upstream [release setup](https://github.com/AgoraIO-Community/agora-speaking-coach-demo/blob/main/docs/npm-release.md) for publishing and official website deployment. The official deployment workflow filters main updates by runtime/build paths and calls CI before publishing; README-only updates do not deploy. Keep native Vercel Git deployment disconnected for the official site. Do not publish or change remote configuration without separate authorization.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Saved progress, public URL and conversation logging

Saved progress is practice history, not assessment. Never present it as a score, grade or proficiency level.

### Ask before choosing

- **Progress store.** When setting up or deploying this recipe, ask the user which store to use instead of choosing silently. The default is `file`, with `sqlite` as the local database option; `postgres` (Neon or Supabase) is required on serverless hosts such as Vercel, where local files do not persist. `PROGRESS_STORE` selects the adapter; a misconfigured store is an error, never a silent fallback.
- **Conversation logging.** Storing conversation text is a privacy decision. Ask the user before setting `AGORA_WEBHOOK_SECRET`, and before creating or changing any webhook configuration on the Agora project. Remote project settings are never changed without explicit authorization.

### One public URL, two endpoints

`COACH_PUBLIC_BASE_URL` is this app's public address: a hosted deployment, or a tunnel for local work (for example `ngrok http 3000`, then use the `https://<id>.ngrok.app` address). Agora's cloud calls it, so `localhost` does not work. It configures both:

| Endpoint | Path | Used for | Also needs |
|---|---|---|---|
| Coach tools | `<COACH_PUBLIC_BASE_URL>/api/progress/coach` | The coach records corrections and the lesson result during the call | Nothing else; set the URL and tools are on |
| Webhook | `<COACH_PUBLIC_BASE_URL>/api/agora-webhook` | Agora delivers the finished conversation's text after the call | `AGORA_WEBHOOK_SECRET` and a webhook configuration on the Agora project |

Unset: the browser reports each finished session, the learner marks lessons complete, the coach has no tools, and conversations are not logged. Never use the browser's real-time transcript as the stored log; it is display only.

### Enabling conversation logging

1. Get the user's go-ahead (see above) and a public URL.
2. Create the webhook on the Agora project, subscribed to the agent history event. With the Agora CLI: `agora project webhook create --feature convoai --url <COACH_PUBLIC_BASE_URL>/api/agora-webhook --events agent-memory --project <project>`. The same can be done in Agora Console under the project's Notifications settings.
3. Put the signing secret in `AGORA_WEBHOOK_SECRET` (server only; `agora project webhook show <config-id> --feature convoai --with-secret` prints it, so never run that where output is shared or logged).
4. Run `pnpm run doctor`: it states whether tools and conversation logging are configured without printing values.

`agent-memory` is the CLI's name for the event the docs call agent history (`eventType` 103); that mapping is inferred from the names and has not been confirmed with a live delivery.

### What is stored

Per learner: lessons started and completed, sessions (lesson, times, turn count), coach-recorded corrections (tool mode), and logged conversations (logging on): the newest 20, each at most 200 turns of 2,000 characters, dropped after 90 days. The conversation text Agora sends is the agent's stored dialogue, capped by `maxHistory` on the model config (100), so a very long session can arrive without its earliest turns. Reset my progress deletes all of it, including agent links. Keep these caps, the retention rule and the delete path when changing the model.

### Rules to preserve

- The learner id lives only in an httpOnly cookie; the learner code and the cookie are bearer secrets and are never logged or put in prompts. The browser view carries metadata, never conversation text.
- The webhook rejects unsigned or wrongly signed requests, is idempotent per agent, and only stores conversations for agents this app linked to a learner at start.
- The coach tool endpoint trusts only its per-session signed token for learner and lesson, never the request body.
- These sample endpoints are not production authentication or abuse controls.
