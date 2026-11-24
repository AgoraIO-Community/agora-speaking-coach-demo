// Shared English side of every lesson. Each language pack below supplies the
// target-language side in the same topic and phrase order.
const TOPICS = [
  {
    id: 'introductions',
    title: 'Introduce yourself',
    goal: 'Introduce yourself and exchange everyday details.',
    setting: (name: string) => `Meet a ${name}-speaking neighbor in Boston. Use a fictional name.`,
    request: (name: string) => `I am a beginner. Help me introduce myself in ${name}.`,
    meanings: ['Hello, my name is Alex.', 'I live in Boston.', 'Nice to meet you.'],
  },
  {
    id: 'restaurant',
    title: 'Order a meal',
    goal: 'Order politely and express one preference.',
    setting: (name: string) => `Role-play at a fictional ${name}-speaking restaurant in Seattle. No order is placed.`,
    request: (name: string) => `Let’s practice ordering food in ${name}.`,
    meanings: ['I would like a soup, please.', 'Not spicy, please.', 'Could you bring me a glass of water, please?'],
  },
  {
    id: 'workplace',
    title: 'Talk with a colleague',
    goal: 'Discuss a project and explain a next step or a different opinion.',
    setting: (name: string) => `Practice with a fictional ${name}-speaking colleague in a U.S. office. No meeting is scheduled.`,
    request: (name: string) => `I am intermediate. Practice a workplace conversation with me in ${name}.`,
    meanings: ['Can we review the project?', 'I think we can start tomorrow.', 'Could you repeat that, please?'],
  },
] as const;

type Triple<T> = readonly [T, T, T];

type TopicPack = {
  /** Starter question the coach can open the role-play with. */
  question: string;
  /** One follow-up example per level. */
  followUps: { beginner: string; intermediate: string; advanced: string };
  /** Translations of the topic's three English meanings, in order. */
  phrases: Triple<string>;
  /** Teaching fixture only; never an actual learner response. */
  correction: { learner: string; alternative: string; explanation: string };
};

type LanguagePack = {
  /** BCP 47 code: request value, `lang` attribute and Deepgram `multi` language. */
  id: string;
  /** English name used in the prompt and UI. */
  name: string;
  /** Name in the language itself, shown on the picker. */
  nativeName: string;
  /** MiniMax system voice ID. */
  voice: string;
  /** Introductions, restaurant, workplace: same order as TOPICS. */
  topics: Triple<TopicPack>;
};

// To add a practice language, append one pack here. The picker, phrasebook,
// prompt, greeting, voice and request validation all derive from this list.
export const PRACTICE_LANGUAGES = [
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    voice: 'Spanish_SereneWoman',
    topics: [
      {
        question: '¿Cómo te llamas?',
        followUps: {
          beginner: '¿Dónde vives?',
          intermediate: '¿Qué te gusta hacer en tu tiempo libre?',
          advanced: '¿Cómo describirías tu trabajo a un nuevo compañero?',
        },
        phrases: ['Hola, me llamo Alex.', 'Vivo en Boston.', 'Mucho gusto.'],
        correction: {
          learner: 'Yo vivir en Boston.',
          alternative: 'Vivo en Boston.',
          explanation: 'Use vivo for I live. The subject yo is optional here.',
        },
      },
      {
        question: '¿Qué te gustaría pedir?',
        followUps: {
          beginner: '¿Qué quieres beber?',
          intermediate: '¿Tienes alguna otra preferencia?',
          advanced: '¿Cómo explicarías que prefieres un plato menos picante?',
        },
        phrases: ['Quisiera una sopa, por favor.', 'Sin picante, por favor.', '¿Me trae un vaso de agua, por favor?'],
        correction: {
          learner: 'Quiero un sopa.',
          alternative: 'Quiero una sopa.',
          explanation: 'Sopa is feminine, so use una. Quisiera is another polite way to ask.',
        },
      },
      {
        question: '¿Tienes tiempo hoy?',
        followUps: {
          beginner: '¿Qué quieres revisar primero?',
          intermediate: '¿Cuál es el siguiente paso del proyecto?',
          advanced: '¿Cómo propondrías una alternativa si no estás de acuerdo?',
        },
        phrases: ['¿Podemos revisar el proyecto?', 'Creo que podemos empezar mañana.', '¿Puedes repetirlo, por favor?'],
        correction: {
          learner: 'Nosotros puede empezar mañana.',
          alternative: 'Podemos empezar mañana.',
          explanation: 'Use podemos with nosotros. You can omit nosotros when the meaning is clear.',
        },
      },
    ],
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    voice: 'French_MovieLeadFemale',
    topics: [
      {
        question: 'Comment vous appelez-vous ?',
        followUps: {
          beginner: 'Où habitez-vous ?',
          intermediate: 'Qu’aimez-vous faire pendant votre temps libre ?',
          advanced: 'Comment décririez-vous votre travail à un nouveau collègue ?',
        },
        phrases: ['Bonjour, je m’appelle Alex.', 'J’habite à Boston.', 'Enchanté de vous rencontrer.'],
        correction: {
          learner: 'Je habiter à Boston.',
          alternative: 'J’habite à Boston.',
          explanation: 'Use habite with je. Je shortens to j’ before a vowel sound.',
        },
      },
      {
        question: 'Que souhaitez-vous commander ?',
        followUps: {
          beginner: 'Que voulez-vous boire ?',
          intermediate: 'Avez-vous une autre préférence ?',
          advanced: 'Comment expliqueriez-vous que vous préférez un plat moins épicé ?',
        },
        phrases: ['Je voudrais une soupe, s’il vous plaît.', 'Pas épicé, s’il vous plaît.', 'Pourrais-je avoir un verre d’eau, s’il vous plaît ?'],
        correction: {
          learner: 'Je veux un soupe.',
          alternative: 'Je voudrais une soupe.',
          explanation: 'Soupe is feminine, so use une. Je voudrais is more polite than je veux.',
        },
      },
      {
        question: 'Avez-vous un moment aujourd’hui ?',
        followUps: {
          beginner: 'Que voulez-vous revoir en premier ?',
          intermediate: 'Quelle est la prochaine étape du projet ?',
          advanced: 'Comment proposeriez-vous une autre solution si vous n’êtes pas d’accord ?',
        },
        phrases: ['Pouvons-nous faire le point sur le projet ?', 'Je pense que nous pouvons commencer demain.', 'Pourriez-vous répéter, s’il vous plaît ?'],
        correction: {
          learner: 'Nous peut commencer demain.',
          alternative: 'Nous pouvons commencer demain.',
          explanation: 'Use pouvons with nous.',
        },
      },
    ],
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    voice: 'German_SweetLady',
    topics: [
      {
        question: 'Wie heißen Sie?',
        followUps: {
          beginner: 'Wo wohnen Sie?',
          intermediate: 'Was machen Sie gern in Ihrer Freizeit?',
          advanced: 'Wie würden Sie einem neuen Kollegen Ihre Arbeit beschreiben?',
        },
        phrases: ['Hallo, ich heiße Alex.', 'Ich wohne in Boston.', 'Schön, Sie kennenzulernen.'],
        correction: {
          learner: 'Ich wohnen in Boston.',
          alternative: 'Ich wohne in Boston.',
          explanation: 'Use wohne with ich.',
        },
      },
      {
        question: 'Was möchten Sie bestellen?',
        followUps: {
          beginner: 'Was möchten Sie trinken?',
          intermediate: 'Haben Sie noch einen Wunsch?',
          advanced: 'Wie würden Sie erklären, dass Sie ein weniger scharfes Gericht bevorzugen?',
        },
        phrases: ['Ich hätte gern eine Suppe, bitte.', 'Bitte nicht scharf.', 'Könnte ich bitte ein Glas Wasser bekommen?'],
        correction: {
          learner: 'Ich möchte ein Suppe.',
          alternative: 'Ich möchte eine Suppe.',
          explanation: 'Suppe is feminine, so use eine. Ich hätte gern is another polite way to ask.',
        },
      },
      {
        question: 'Haben Sie heute Zeit?',
        followUps: {
          beginner: 'Was möchten Sie zuerst besprechen?',
          intermediate: 'Was ist der nächste Schritt im Projekt?',
          advanced: 'Wie würden Sie eine Alternative vorschlagen, wenn Sie anderer Meinung sind?',
        },
        phrases: ['Können wir das Projekt besprechen?', 'Ich glaube, wir können morgen anfangen.', 'Könnten Sie das bitte wiederholen?'],
        correction: {
          learner: 'Wir kann morgen anfangen.',
          alternative: 'Wir können morgen anfangen.',
          explanation: 'Use können with wir.',
        },
      },
    ],
  },
  {
    id: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    voice: 'Portuguese_GentleTeacher',
    topics: [
      {
        question: 'Como você se chama?',
        followUps: {
          beginner: 'Onde você mora?',
          intermediate: 'O que você gosta de fazer no seu tempo livre?',
          advanced: 'Como você descreveria o seu trabalho para um novo colega?',
        },
        phrases: ['Olá, meu nome é Alex.', 'Eu moro em Boston.', 'Muito prazer.'],
        correction: {
          learner: 'Eu morar em Boston.',
          alternative: 'Eu moro em Boston.',
          explanation: 'Use moro for I live.',
        },
      },
      {
        question: 'O que você gostaria de pedir?',
        followUps: {
          beginner: 'O que você quer beber?',
          intermediate: 'Você tem mais alguma preferência?',
          advanced: 'Como você explicaria que prefere um prato menos apimentado?',
        },
        phrases: ['Eu queria uma sopa, por favor.', 'Sem pimenta, por favor.', 'Pode me trazer um copo de água, por favor?'],
        correction: {
          learner: 'Eu quero um sopa.',
          alternative: 'Eu quero uma sopa.',
          explanation: 'Sopa is feminine, so use uma. Eu queria is a softer, polite way to ask.',
        },
      },
      {
        question: 'Você tem um tempo hoje?',
        followUps: {
          beginner: 'O que você quer revisar primeiro?',
          intermediate: 'Qual é o próximo passo do projeto?',
          advanced: 'Como você proporia uma alternativa se não concordasse?',
        },
        phrases: ['Podemos revisar o projeto?', 'Acho que podemos começar amanhã.', 'Pode repetir, por favor?'],
        correction: {
          learner: 'Nós pode começar amanhã.',
          alternative: 'Nós podemos começar amanhã.',
          explanation: 'Use podemos with nós.',
        },
      },
    ],
  },
  {
    id: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    voice: 'Japanese_KindLady',
    topics: [
      {
        question: 'お名前は何ですか。',
        followUps: {
          beginner: 'どこに住んでいますか。',
          intermediate: '休みの日は何をするのが好きですか。',
          advanced: '新しい同僚に自分の仕事をどう説明しますか。',
        },
        phrases: ['こんにちは、アレックスです。', 'ボストンに住んでいます。', 'はじめまして。'],
        correction: {
          learner: 'ボストンで住んでいます。',
          alternative: 'ボストンに住んでいます。',
          explanation: 'Use the particle に with 住んでいます to say where you live.',
        },
      },
      {
        question: 'ご注文は何になさいますか。',
        followUps: {
          beginner: '飲み物は何にしますか。',
          intermediate: 'ほかにご希望はありますか。',
          advanced: 'あまり辛くない料理がいいと、どう説明しますか。',
        },
        phrases: ['スープをお願いします。', '辛くしないでください。', 'お水を一杯いただけますか。'],
        correction: {
          learner: 'スープがお願いします。',
          alternative: 'スープをお願いします。',
          explanation: 'Use the particle を before お願いします for the thing you are asking for.',
        },
      },
      {
        question: '今日、お時間はありますか。',
        followUps: {
          beginner: 'まず何を確認したいですか。',
          intermediate: 'プロジェクトの次のステップは何ですか。',
          advanced: '賛成できないとき、どのように別の案を提案しますか。',
        },
        phrases: ['プロジェクトを確認できますか。', '明日から始められると思います。', 'もう一度言っていただけますか。'],
        correction: {
          learner: '明日から始めるできます。',
          alternative: '明日から始められます。',
          explanation: 'Use the potential form 始められます instead of adding できます to the verb.',
        },
      },
    ],
  },
  {
    id: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    voice: 'Korean_SoothingLady',
    topics: [
      {
        question: '이름이 뭐예요?',
        followUps: {
          beginner: '어디에 살아요?',
          intermediate: '시간이 있을 때 뭐 하는 걸 좋아해요?',
          advanced: '새 동료에게 자신의 일을 어떻게 설명하시겠어요?',
        },
        phrases: ['안녕하세요, 저는 알렉스예요.', '저는 보스턴에 살아요.', '만나서 반갑습니다.'],
        correction: {
          learner: '저는 보스턴을 살아요.',
          alternative: '저는 보스턴에 살아요.',
          explanation: 'Use the particle 에 with 살아요 to say where you live.',
        },
      },
      {
        question: '무엇을 주문하시겠어요?',
        followUps: {
          beginner: '음료는 뭐로 하시겠어요?',
          intermediate: '다른 원하시는 것이 있으세요?',
          advanced: '덜 매운 음식을 원한다고 어떻게 설명하시겠어요?',
        },
        phrases: ['수프 하나 주세요.', '맵지 않게 해 주세요.', '물 한 잔 주시겠어요?'],
        correction: {
          learner: '수프 하나 주다.',
          alternative: '수프 하나 주세요.',
          explanation: 'Use the polite request form 주세요 instead of the dictionary form 주다.',
        },
      },
      {
        question: '오늘 시간 있으세요?',
        followUps: {
          beginner: '무엇을 먼저 검토하고 싶으세요?',
          intermediate: '프로젝트의 다음 단계는 무엇인가요?',
          advanced: '동의하지 않을 때 어떻게 다른 방안을 제안하시겠어요?',
        },
        phrases: ['프로젝트를 검토할 수 있을까요?', '내일 시작할 수 있을 것 같아요.', '다시 한번 말씀해 주시겠어요?'],
        correction: {
          learner: '내일 시작할 수 있어 같아요.',
          alternative: '내일 시작할 수 있을 것 같아요.',
          explanation: 'Use 을 것 같아요 after the verb stem to say that something seems likely.',
        },
      },
    ],
  },
] as const satisfies readonly LanguagePack[];

export type PracticeLanguage = (typeof PRACTICE_LANGUAGES)[number]['id'];
export const DEFAULT_PRACTICE_LANGUAGE: PracticeLanguage = 'es';

export function isPracticeLanguage(value: unknown): value is PracticeLanguage {
  return PRACTICE_LANGUAGES.some(({ id }) => id === value);
}

export function getPracticeLanguage(language: PracticeLanguage): LanguagePack {
  return PRACTICE_LANGUAGES.find(({ id }) => id === language)!;
}

export function getLessons(language: PracticeLanguage) {
  const { name, topics } = getPracticeLanguage(language);
  return TOPICS.map((topic, index) => ({
    id: topic.id,
    title: topic.title,
    goal: topic.goal,
    setting: topic.setting(name),
    request: topic.request(name),
    question: topics[index].question,
    followUps: topics[index].followUps,
    correction: topics[index].correction,
    phrases: topic.meanings.map((english, phraseIndex) => ({
      expression: topics[index].phrases[phraseIndex],
      english,
    })),
  }));
}

export function getLessonContext(language: PracticeLanguage = DEFAULT_PRACTICE_LANGUAGE): string {
  return getLessons(language).map(lesson => [
    `## ${lesson.title}`, lesson.setting, `Practice goal: ${lesson.goal}`, `Starter question: ${lesson.question}`,
    `Follow-up examples by level: ${JSON.stringify(lesson.followUps)}`,
    ...lesson.phrases.map(phrase => `${phrase.expression} | Meaning: ${phrase.english}`),
    `Illustrative correction ONLY, not an actual learner response: ${JSON.stringify(lesson.correction)}`,
  ].join('\n')).join('\n\n');
}
