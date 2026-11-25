export interface ScenarioPresentation {
  id: string;
  name: string;
  purpose: string;
  summary: string;
  builtWith: string[];
  startLabel: string;
  /** Speaker labels shown beside transcript turns. */
  speakers: { agent: string; learner: string };
  boundaryShort: string;
  outcomes: { id: string; label: string }[];
  developer: {
    sourceUrl: string;
    runCommand: string;
    assistantPrompt: string;
    createCommand: string;
    testRequest: string;
    configurationNote?: string;
    docsUrl: string;
    sdkUrl: string;
    consoleUrl: string;
    cliUrl: string;
    extensionPoints: { title: string; path: string }[];
  };
}
