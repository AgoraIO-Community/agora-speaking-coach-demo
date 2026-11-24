import type { LlmTool } from 'agora-agents';

/** Where and how Agora's cloud reaches this app's coach tool endpoint for one session. */
export type CoachToolContext = { baseUrl: string; token: string };

/**
 * Tools the coach may call. Without a context (COACH_TOOL_BASE_URL unset) the
 * coach has no tools and the browser reports progress instead.
 *
 * These are Agora inline REST tools: Agora's cloud performs the HTTP request,
 * so `baseUrl` must be publicly reachable. The per-session token travels as a
 * constant header; the model only supplies the arguments in `parameters`.
 */
export function getScenarioTools(context?: CoachToolContext): LlmTool[] {
  if (!context) return [];
  const server = (body: Record<string, unknown>) => ({
    method: 'POST' as const,
    url: `${context.baseUrl}/api/progress/coach`,
    headers: { Authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' },
    body,
    timeout_ms: 5000,
  });
  return [
    {
      type: 'function',
      function: {
        name: 'record_correction',
        description: 'Save one correction you just gave for something the learner actually said in this call. Never use lesson examples.',
        parameters: {
          type: 'object',
          properties: {
            learner_phrase: { type: 'string', description: 'What the learner said, as recognized. At most 200 characters.' },
            alternative: { type: 'string', description: 'The corrected or more natural phrase you suggested.' },
            note: { type: 'string', description: 'One short English reason.' },
          },
          required: ['learner_phrase', 'alternative'],
        },
      },
      server: server({
        type: 'correction',
        learner_phrase: '{{args.learner_phrase}}',
        alternative: '{{args.alternative}}',
        note: '{{args.note}}',
      }),
    },
    {
      type: 'function',
      function: {
        name: 'record_objective_result',
        description: 'Save whether the learner demonstrated the lesson objective in the check step, without a model to copy. Call once after the check.',
        parameters: {
          type: 'object',
          properties: {
            met: { type: 'boolean', description: 'True only if the learner completed the check task in this call.' },
          },
          required: ['met'],
        },
      },
      server: server({ type: 'objective', met: '{{args.met}}' }),
    },
  ];
}
