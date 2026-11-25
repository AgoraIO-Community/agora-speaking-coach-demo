// Shared non-secret configuration: the server consumes these exact model IDs.
export const RUNTIME_PROFILE = {
  // Default recognizer: Agora ARES with English plus the practice language as
  // candidate languages. Measured against Deepgram nova-3 `multi` with
  // synthetic voices; see ARCHITECTURE.md#speech-configuration.
  recognition: {
    provider: 'Agora',
    model: 'ARES',
    // The coach always guides in English, so English is a candidate in every session.
    language: 'en-US',
    // Fallback recognizer, selected with COACH_STT_VENDOR=deepgram.
    deepgram: {
      model: 'nova-3',
      language: 'multi',
      guidanceLanguage: 'en',
      // Deepgram's recommended `endpointing` (ms) for code switching; its
      // default is 10. Not sent unless COACH_STT_ENDPOINTING is set.
      recommendedEndpointing: 100,
    },
  },
  // Audio kept from before detected speech, so short answers are not clipped.
  // 800 is Agora's documented default.
  turnDetection: { prefixPaddingMs: 800 },
  reasoning: { provider: 'OpenAI', model: 'gpt-4o-mini' },
  synthesis: {
    provider: 'MiniMax',
    model: 'speech_2_6_turbo',
  },
} as const;

export type RecognitionVendor = 'ares' | 'deepgram';

/** COACH_STT_VENDOR: Agora ARES unless Deepgram is explicitly requested. */
export function getRecognitionVendor(value: string | undefined): RecognitionVendor {
  return (value ?? '').trim().toLowerCase() === 'deepgram' ? 'deepgram' : 'ares';
}

/** COACH_STT_KEYWORDS: lesson keywords are sent to ARES unless set to off, false or 0. */
export function getRecognitionKeywordsEnabled(value: string | undefined): boolean {
  return !['off', 'false', '0'].includes((value ?? '').trim().toLowerCase());
}

/** ARES candidate languages for one session: English guidance plus the practice language. */
export function getRecognitionLanguages(practiceLocale: string): string[] {
  return [...new Set<string>([RUNTIME_PROFILE.recognition.language, practiceLocale])];
}

/**
 * A fetch for the Agora client that sends the ARES candidate languages.
 *
 * ARES takes them as one comma-separated `asr.language`, for example
 * `en-US,es-ES`. agora-agents 2.14 always writes a single tag there (2.15
 * accepts a list in `turnDetection.language`), so the start request is
 * completed here. Only an ARES start request is changed; replace this with the
 * SDK option after upgrading.
 */
export function withRecognitionLanguages(languages: readonly string[]): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (init?.method?.toUpperCase() === 'POST' && typeof init.body === 'string' && new URL(url).pathname.endsWith('/join')) {
      const body = JSON.parse(init.body) as { properties?: { asr?: { vendor?: string; language?: string } } };
      const asr = body.properties?.asr;
      if (asr?.vendor === 'ares') {
        asr.language = languages.join(',');
        return fetch(input, { ...init, body: JSON.stringify(body) });
      }
    }
    return fetch(input, init);
  };
}

export type RecognitionHintMode = 'off' | 'list' | 'single';

/**
 * COACH_STT_LANGUAGE_HINT, Deepgram fallback only. Keep the list form off: in
 * repeated tests `language_hint` sent as a list returned empty recognized text
 * for every learner turn, with no error. `on` sends English plus the practice
 * language as a list; `single` sends only the practice language as one string
 * and measured no better than no hint.
 */
export function getRecognitionHintMode(value: string | undefined): RecognitionHintMode {
  const mode = (value ?? '').trim().toLowerCase();
  if (['on', 'true', '1', 'list'].includes(mode)) return 'list';
  return mode === 'single' ? 'single' : 'off';
}

/** COACH_STT_ENDPOINTING, Deepgram fallback only: milliseconds, sent only when set to a whole number from 10 to 5000. */
export function getRecognitionEndpointing(value: string | undefined): number | null {
  const text = (value ?? '').trim();
  if (!/^\d{1,4}$/.test(text)) return null;
  const ms = Number(text);
  return ms >= 10 && ms <= 5000 ? ms : null;
}

/**
 * Extra parameters for the Deepgram fallback, passed through unchanged in
 * `asr.params`; empty by default, which is plain nova-3 `multi`. `language_hint` biases `multi`
 * detection toward the hinted languages; it does not restrict recognition.
 */
export function getRecognitionParams(
  practiceLanguageCode: string,
  options: { hint: RecognitionHintMode; endpointing: number | null },
): { endpointing?: number; language_hint?: string | string[] } {
  const { guidanceLanguage } = RUNTIME_PROFILE.recognition.deepgram;
  return {
    ...(options.endpointing === null ? {} : { endpointing: options.endpointing }),
    ...(options.hint === 'list'
      ? { language_hint: [...new Set<string>([guidanceLanguage, practiceLanguageCode])] }
      : options.hint === 'single'
        ? { language_hint: practiceLanguageCode }
        : {}),
  };
}
