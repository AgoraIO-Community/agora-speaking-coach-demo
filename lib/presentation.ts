import type { ScenarioPresentation } from '@/types/presentation';
export type { ScenarioPresentation } from '@/types/presentation';
export const presentation: ScenarioPresentation = {
  id: '06-speaking-coach',
  name: 'Speaking Coach',
  purpose: "Mandarin practice with English guidance",
  summary: 'Practice short Chinese phrases with English guidance throughout. Choose more Mandarin immersion only when you want it.',
  featuresHeading: 'Practice with your coach',
  features: [
    {
      emoji: '💬',
      title: 'Short phrases with English meaning',
    },
    {
      emoji: '📖',
      title: 'Pinyin & English reading aids',
    },
    {
      emoji: '🌱',
      title: 'English feedback & session recap',
    },
  ],
  builtWith: ['Agora Conversational AI', 'Agents SDK', 'Next.js'],
  startLabel: 'Practice Mandarin',
  boundaryShort: 'Conversation-based coaching. No pronunciation scores or saved learning progress.',
  outcomes: [
    { id: 'practiced', label: 'I practiced useful Mandarin' },
    { id: 'clearer', label: 'I understand an expression better' },
    { id: 'needs-work', label: 'I need more help' },
  ],
  developer: {
    sourceUrl: "https://github.com/AgoraIO-Community/agora-speaking-coach-demo",
    runCommand:
      'pnpm install --frozen-lockfile\n# Copy env.local.example to .env.local if it does not exist.\n# Fill the two Agora project credentials.\npnpm run doctor\npnpm run dev',
    skillsCommand: 'npx skills add github:AgoraIO/skills',
    assistantPrompt:
      'Use Agora Skills to adapt this local Speaking Coach checkout. Read README.md, RECIPE.md and AGENTS.md first. Preserve RTC/RTM ownership and bilingual recognition. Customize lib/lessons.ts and lib/agent-config.ts for Mandarin learners. Keep transcript feedback separate from acoustic pronunciation assessment.',
    docsUrl: 'https://docs.agora.io/en/ai/build/build-server-client',
    sdkUrl: 'https://www.npmjs.com/package/agora-agents',
    consoleUrl: 'https://console.agora.io/',
    cliUrl: 'https://github.com/AgoraIO/cli',
    skillsUrl: 'https://github.com/AgoraIO/skills',
    extensionPoints: [
      { title: 'Adapt lessons and phrase cards', path: 'lib/lessons.ts' },
      {
        title: 'Change the assistant’s instructions',
        path: 'lib/agent-config.ts',
      },
      {
        title: 'Choose models and voice',
        path: 'lib/runtime-profile.ts',
      },
      {
        title: 'Tune turn detection',
        path: 'app/api/invite-agent/route.ts',
      },
      { title: 'Connect business tools', path: 'lib/agent-tools.ts' },
      {
        title: 'Adapt this scenario’s value and UI content',
        path: 'lib/presentation.ts',
      },
    ],
  },
};

export function getScenarioPresentation(): ScenarioPresentation {
  return presentation;
}
