const spanishLessons = [
  {
    "id": "introductions",
    "title": "Introduce yourself",
    "setting": "Meet a Spanish-speaking neighbor in Boston. Use a fictional name.",
    "request": "I am a beginner. Help me introduce myself in Spanish.",
    "question": "¿Cómo te llamas?",
    "goal": "Introduce yourself and exchange everyday details.",
    "followUpQuestions": {
      "beginner": "¿Dónde vives?",
      "intermediate": "¿Qué te gusta hacer en tu tiempo libre?",
      "advanced": "¿Cómo describirías tu trabajo a un nuevo compañero?"
    },
    "phrases": [
      {
        "spanish": "Hola, me llamo Alex.",
        "english": "Hello, my name is Alex."
      },
      {
        "spanish": "Vivo en Boston.",
        "english": "I live in Boston."
      },
      {
        "spanish": "Mucho gusto.",
        "english": "Nice to meet you."
      }
    ],
    "correction": {
      "learner": "Yo vivir en Boston.",
      "alternative": "Vivo en Boston.",
      "explanation": "Use vivo for I live. The subject yo is optional here."
    }
  },
  {
    "id": "restaurant",
    "title": "Order a meal",
    "setting": "Role-play at a fictional Spanish-speaking restaurant in Seattle. No order is placed.",
    "request": "Let us practice ordering food in Spanish. Explain new words in English.",
    "question": "¿Qué te gustaría pedir?",
    "goal": "Order politely and express one preference.",
    "followUpQuestions": {
      "beginner": "¿Qué quieres beber?",
      "intermediate": "¿Tienes alguna otra preferencia?",
      "advanced": "¿Cómo explicarías que prefieres un plato menos picante?"
    },
    "phrases": [
      {
        "spanish": "Quisiera una sopa, por favor.",
        "english": "I would like a soup, please."
      },
      {
        "spanish": "Sin picante, por favor.",
        "english": "Not spicy, please."
      },
      {
        "spanish": "¿Me trae un vaso de agua, por favor?",
        "english": "Could you bring me a glass of water, please?"
      }
    ],
    "correction": {
      "learner": "Quiero un sopa.",
      "alternative": "Quiero una sopa.",
      "explanation": "Sopa is feminine, so use una. Quisiera is another polite way to ask."
    }
  },
  {
    "id": "workplace",
    "title": "Talk with a colleague",
    "setting": "Practice with a fictional Spanish-speaking colleague in a U.S. office. No meeting is scheduled.",
    "request": "I am intermediate. Practice a workplace conversation with me in Spanish.",
    "question": "¿Tienes tiempo hoy?",
    "goal": "Discuss a project and explain a next step or a different opinion.",
    "followUpQuestions": {
      "beginner": "¿Qué quieres revisar primero?",
      "intermediate": "¿Cuál es el siguiente paso del proyecto?",
      "advanced": "¿Cómo propondrías una alternativa si no estás de acuerdo?"
    },
    "phrases": [
      {
        "spanish": "¿Podemos revisar el proyecto?",
        "english": "Can we review the project?"
      },
      {
        "spanish": "Creo que podemos empezar mañana.",
        "english": "I think we can start tomorrow."
      },
      {
        "spanish": "¿Puedes repetirlo, por favor?",
        "english": "Could you repeat that, please?"
      }
    ],
    "correction": {
      "learner": "Nosotros puede empezar mañana.",
      "alternative": "Podemos empezar mañana.",
      "explanation": "Use podemos with nosotros. You can omit nosotros when the meaning is clear."
    }
  }
] as const;

function getSpanishLessonContext(): string {
  return spanishLessons.map(lesson => [
    `## ${lesson.title}`, lesson.setting, `Practice goal: ${lesson.goal}`, `Starter question: ${lesson.question}`,
    `Follow-up examples by level: ${JSON.stringify(lesson.followUpQuestions)}`,
    ...lesson.phrases.map(phrase => `${phrase.spanish} | Meaning: ${phrase.english}`),
    `Illustrative correction ONLY, not an actual learner response: ${JSON.stringify(lesson.correction)}`,
  ].join('\n')).join('\n\n');
}

export const PRACTICE_LANGUAGES = [
  { id: 'es', name: 'Spanish', voice: 'Spanish_SereneWoman' },
  { id: 'fr', name: 'French', voice: 'French_MovieLeadFemale' },
  { id: 'de', name: 'German', voice: 'German_SweetLady' },
] as const;

export type PracticeLanguage = (typeof PRACTICE_LANGUAGES)[number]['id'];
export const DEFAULT_PRACTICE_LANGUAGE: PracticeLanguage = 'es';

export function isPracticeLanguage(value: unknown): value is PracticeLanguage {
  return PRACTICE_LANGUAGES.some(({ id }) => id === value);
}

export function getPracticeLanguage(language: PracticeLanguage) {
  return PRACTICE_LANGUAGES.find(({ id }) => id === language)!;
}

const additionalPhrases = {
  fr: [
    ['Bonjour, je m’appelle Alex.', 'J’habite à Boston.', 'Enchanté de vous rencontrer.'],
    ['Je voudrais une soupe, s’il vous plaît.', 'Pas épicé, s’il vous plaît.', 'Pourrais-je avoir un verre d’eau, s’il vous plaît ?'],
    ['Pouvons-nous faire le point sur le projet ?', 'Je pense que nous pouvons commencer demain.', 'Pourriez-vous répéter, s’il vous plaît ?'],
  ],
  de: [
    ['Hallo, ich heiße Alex.', 'Ich wohne in Boston.', 'Schön, Sie kennenzulernen.'],
    ['Ich hätte gern eine Suppe, bitte.', 'Bitte nicht scharf.', 'Könnte ich bitte ein Glas Wasser bekommen?'],
    ['Können wir das Projekt besprechen?', 'Ich glaube, wir können morgen anfangen.', 'Könnten Sie das bitte wiederholen?'],
  ],
} as const;

const requests = [
  (name: string) => `I am a beginner. Help me introduce myself in ${name}.`,
  (name: string) => `Let’s practice ordering food in ${name}.`,
  (name: string) => `I am intermediate. Practice a workplace conversation with me in ${name}.`,
] as const;

export function getLessons(language: PracticeLanguage) {
  const name = getPracticeLanguage(language).name;
  return spanishLessons.map((lesson, index) => ({
    id: lesson.id,
    title: lesson.title,
    goal: lesson.goal,
    request: requests[index](name),
    phrases: lesson.phrases.map((phrase, phraseIndex) => ({
      expression: language === 'es' ? phrase.spanish : additionalPhrases[language][index][phraseIndex],
      english: phrase.english,
    })),
  }));
}

export function getLessonContext(language: PracticeLanguage = DEFAULT_PRACTICE_LANGUAGE): string {
  if (language === 'es') return getSpanishLessonContext();
  return getLessons(language).map(lesson => [
    `## ${lesson.title}`,
    `Practice goal: ${lesson.goal}`,
    ...lesson.phrases.map(phrase => `${phrase.expression} | Meaning: ${phrase.english}`),
  ].join('\n')).join('\n\n');
}
