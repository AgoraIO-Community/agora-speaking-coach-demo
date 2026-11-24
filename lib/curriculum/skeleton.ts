// Shared English side of the curriculum. Every language pack supplies the
// target-language side of each lesson in the same item order.
//
// Objectives are written as original CEFR A1-style can-do statements. The
// framework organises lessons only; the coach never assigns a learner a level.
export const CURRICULUM = [
  {
    id: 'beginner',
    title: 'Beginner',
    units: [
      {
        id: 'first-conversations',
        title: 'First conversations',
        lessons: [
          {
            id: 'introduce-yourself',
            title: 'Introduce yourself',
            objective: 'I can greet someone, say my name and say where I live.',
            setting: (name: string) => `Meet a fictional ${name}-speaking neighbor in Boston. Use a fictional name.`,
            partner: 'Neighbor',
            vocabulary: ['Hello.', 'My name is Alex.', 'I live in Boston.', 'Nice to meet you.', 'And you?'],
            dialogue: ['Hello! What is your name?', 'Hello, my name is Alex.', 'Where do you live?', 'I live in Boston. Nice to meet you.'],
            prompts: ['What is your name?', 'Where do you live?'],
          },
          {
            id: 'talk-with-a-colleague',
            title: 'Talk with a colleague',
            objective: 'I can ask a colleague for a moment, suggest a simple next step and ask them to repeat.',
            setting: (name: string) => `Practice with a fictional ${name}-speaking colleague in a U.S. office. No meeting is scheduled.`,
            partner: 'Colleague',
            vocabulary: ['Do you have time today?', 'Can we review the project?', 'I think we can start tomorrow.', 'Could you repeat that, please?', 'Thank you.'],
            dialogue: ['Do you have time today?', 'Yes. Can we review the project?', 'Of course. When can we start?', 'I think we can start tomorrow.'],
            prompts: ['Do you have time today?', 'When can we start?'],
          },
        ],
      },
      {
        id: 'eating-out',
        title: 'Eating out',
        lessons: [
          {
            id: 'order-a-meal',
            title: 'Order a meal',
            objective: 'I can order a dish and a drink politely and state one preference.',
            setting: (name: string) => `Role-play at a fictional ${name}-speaking restaurant in Seattle. No order is placed.`,
            partner: 'Server',
            vocabulary: ['The menu, please.', 'I would like a soup, please.', 'Not spicy, please.', 'A glass of water, please.', 'What do you recommend?'],
            dialogue: ['What would you like to order?', 'I would like a soup, please.', 'Would you like something to drink?', 'A glass of water, please.'],
            prompts: ['What would you like to order?', 'Would you like something to drink?'],
          },
          {
            id: 'ask-for-the-check',
            title: 'Ask for the check',
            objective: 'I can ask for the check, ask how much it is and thank the server.',
            setting: (name: string) => `Finish a meal at a fictional ${name}-speaking restaurant in Seattle. Prices are in USD. No payment is made and no card details are used.`,
            partner: 'Server',
            vocabulary: ['The check, please.', 'How much is it?', 'Can I pay by card?', 'It was delicious.', 'Thank you very much.'],
            dialogue: ['Would you like anything else?', 'No, thank you. The check, please.', 'Here you are. It is twenty dollars.', 'Can I pay by card?'],
            prompts: ['Would you like anything else?', 'How was the meal?'],
          },
        ],
      },
    ],
  },
] as const;

export type LessonId = (typeof CURRICULUM)[number]['units'][number]['lessons'][number]['id'];

/** Target-language text. Non-Latin scripts add a romanized reading aid. */
export type Text = string | { text: string; reading: string };

type ErrorFixture = { learner: string; alternative: string; explanation: string };

export type LessonPack = {
  /** Five expressions, in the order of the lesson's English vocabulary. */
  vocabulary: readonly [Text, Text, Text, Text, Text];
  /** Four lines, partner first, in the order of the English dialogue. */
  dialogue: readonly [Text, Text, Text, Text];
  /** Two questions the coach can ask, in the order of the English prompts. */
  prompts: readonly [Text, Text];
  /** One grammar or usage point, explained in English. */
  grammar: { point: string; examples: readonly { text: Text; english: string }[] };
  /** Teaching fixtures only; never actual learner responses. */
  errors: readonly [ErrorFixture, ErrorFixture];
};

export type LanguagePack<Id extends string = string> = {
  /** BCP 47 code: request value, `lang` attribute and Deepgram `multi` language. */
  id: Id;
  /** English name used in the prompt and UI. */
  name: string;
  /** Name in the language itself, shown on the picker. */
  nativeName: string;
  /** MiniMax system voice ID. */
  voice: string;
  /** Romanization system for reading aids, when the script is not Latin. */
  romanization?: string;
  /** One entry per curriculum lesson; a missing lesson is a type error. */
  lessons: Record<LessonId, LessonPack>;
};

export function definePack<const Id extends string>(pack: LanguagePack<Id>): LanguagePack<Id> {
  return pack;
}
