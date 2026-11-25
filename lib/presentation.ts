import type { ScenarioPresentation } from '@/types/presentation';
export type { ScenarioPresentation } from '@/types/presentation';
export const presentation: ScenarioPresentation = {
  id: '06-speaking-coach',
  name: 'Multilingual Speaking Coach',
  purpose: "Language practice with English guidance",
  summary: 'Pick a language and a lesson, then practice Spanish, French, German, Portuguese, Japanese or Korean with English guidance. Ask for immersion when you’re ready. Your practice history is saved so you can pick up where you left off.',
  builtWith: ['Agora Conversational AI', 'Agents SDK', 'Next.js'],
  startLabel: 'Start practice',
  speakers: { agent: 'Coach', learner: 'You' },
  boundaryShort: 'Conversation-based coaching with saved practice history. No pronunciation scores or proficiency grades.',
  outcomes: [
    { id: 'practiced', label: 'I practiced useful expressions' },
    { id: 'clearer', label: 'I understand an expression better' },
    { id: 'needs-work', label: 'I need more help' },
  ],
  "developer": {
    "sourceUrl": "https://github.com/AgoraIO-Community/agora-speaking-coach-demo",
    "runCommand": "pnpm install --frozen-lockfile\npnpm run doctor\npnpm run dev",
    "assistantPrompt": "Help me create and run the Multilingual Speaking Coach using Agora CLI.\n\nCheck that Agora CLI is installed and ready. If installation or an upgrade is needed, ask before proceeding. Guide me through browser login when required.\n\nGet the recipe details:\nagora recipes show agora-speaking-coach-demo --json\n\nRead its implementation guide:\nhttps://raw.githubusercontent.com/AgoraIO-Community/agora-speaking-coach-demo/main/RECIPE.md\n\nReference source:\nhttps://github.com/AgoraIO-Community/agora-speaking-coach-demo\n\nBefore initialization, confirm which Agora project to use. Ask before creating a new Agora project.\n\nInitialize the app in a new or empty directory. Replace <confirmed-project-id> with the actual ID of the project confirmed above before running:\nagora init my-speaking-app --recipe agora-speaking-coach-demo --project <confirmed-project-id> --json\n\nLet the CLI configure the credentials. Never print the App Certificate in chat or expose it in browser code.\n\nFollow the returned nextSteps to install dependencies and start the app. Help diagnose and resolve any errors.\n\nProvide the local URL and guide me through microphone access. Help me test this request:\n\"Yes, I’m ready. Please go slowly, and give me feedback at the end.\"\n\nReport what was verified and what still needs testing. Follow the capabilities and limits in the implementation guide; do not claim external actions were completed without verification.",
    "docsUrl": "https://docs.agora.io/en/ai/build/build-server-client",
    "sdkUrl": "https://github.com/AgoraIO/agora-agents-ts",
    "consoleUrl": "https://console.agora.io/",
    "cliUrl": "https://github.com/AgoraIO/cli",
    "extensionPoints": [
      {
        "title": "Adapt the curriculum and language packs",
        "path": "lib/curriculum"
      },
      {
        "title": "Change the assistant’s instructions",
        "path": "lib/agent-config.ts"
      },
      {
        "title": "Choose models and voice",
        "path": "lib/runtime-profile.ts"
      },
      {
        "title": "Tune turn detection",
        "path": "app/api/invite-agent/route.ts"
      },
      {
        "title": "Change what the coach can record",
        "path": "lib/agent-tools.ts"
      },
      {
        "title": "Choose where progress is stored",
        "path": "lib/progress/store.ts"
      },
      {
        "title": "Adapt this scenario’s value and UI content",
        "path": "lib/presentation.ts"
      }
    ],
    "createCommand": "npx agora-speaking-coach-demo@latest my-speaking-app\ncd my-speaking-app",
    "testRequest": "Yes, I’m ready. Please go slowly, and give me feedback at the end."
  }
};

export function getScenarioPresentation(): ScenarioPresentation {
  return presentation;
}
