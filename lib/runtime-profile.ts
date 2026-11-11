// Shared non-secret configuration: the server consumes these exact model IDs.
export const RUNTIME_PROFILE = {
  recognition: { provider: 'Deepgram', model: 'nova-3', language: 'multi' },
  reasoning: { provider: 'OpenAI', model: 'gpt-4o-mini' },
  synthesis: {
    provider: 'MiniMax',
    model: 'speech_2_6_turbo',
    voice: 'Chinese (Mandarin)_Warm_Bestie',
  },
} as const;
