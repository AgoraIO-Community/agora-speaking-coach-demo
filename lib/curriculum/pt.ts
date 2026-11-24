import { definePack } from './skeleton';

export const pt = definePack({
  id: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  voice: 'Portuguese_GentleTeacher',
  lessons: {
    'introduce-yourself': {
      vocabulary: ['Olá.', 'Meu nome é Alex.', 'Eu moro em Boston.', 'Muito prazer.', 'E você?'],
      dialogue: ['Olá! Como você se chama?', 'Olá, meu nome é Alex.', 'Onde você mora?', 'Eu moro em Boston. Muito prazer.'],
      prompts: ['Como você se chama?', 'Onde você mora?'],
      grammar: {
        point: 'Verbs change their ending for I. Morar becomes eu moro, and with você the verb is mora.',
        examples: [
          { text: 'Eu moro em Boston.', english: 'I live in Boston.' },
          { text: 'Onde você mora?', english: 'Where do you live?' },
        ],
      },
      errors: [
        { learner: 'Eu morar em Boston.', alternative: 'Eu moro em Boston.', explanation: 'Use moro for I live.' },
        { learner: 'Meu nome sou Alex.', alternative: 'Meu nome é Alex.', explanation: 'Use é with meu nome. Sou goes with eu.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: ['Você tem um tempo hoje?', 'Podemos revisar o projeto?', 'Acho que podemos começar amanhã.', 'Pode repetir, por favor?', 'Obrigado.'],
      dialogue: ['Você tem um tempo hoje?', 'Sim. Podemos revisar o projeto?', 'Claro. Quando podemos começar?', 'Acho que podemos começar amanhã.'],
      prompts: ['Você tem um tempo hoje?', 'Quando podemos começar?'],
      grammar: {
        point: 'Poder plus an infinitive says what someone can do. Use podemos for we can and pode for you can.',
        examples: [
          { text: 'Podemos começar amanhã.', english: 'We can start tomorrow.' },
          { text: 'Pode repetir?', english: 'Can you repeat?' },
        ],
      },
      errors: [
        { learner: 'Nós pode começar amanhã.', alternative: 'Nós podemos começar amanhã.', explanation: 'Use podemos with nós.' },
        { learner: 'Podemos revisamos o projeto.', alternative: 'Podemos revisar o projeto.', explanation: 'After podemos, keep the second verb in the infinitive: revisar.' },
      ],
    },
    'order-a-meal': {
      vocabulary: ['O cardápio, por favor.', 'Eu queria uma sopa, por favor.', 'Sem pimenta, por favor.', 'Um copo de água, por favor.', 'O que você recomenda?'],
      dialogue: ['O que você gostaria de pedir?', 'Eu queria uma sopa, por favor.', 'Você gostaria de beber alguma coisa?', 'Um copo de água, por favor.'],
      prompts: ['O que você gostaria de pedir?', 'Você gostaria de beber alguma coisa?'],
      grammar: {
        point: 'Nouns have gender. Use uma with feminine nouns such as sopa and um with masculine nouns such as copo.',
        examples: [
          { text: 'uma sopa', english: 'a soup' },
          { text: 'um copo de água', english: 'a glass of water' },
        ],
      },
      errors: [
        { learner: 'Eu quero um sopa.', alternative: 'Eu quero uma sopa.', explanation: 'Sopa is feminine, so use uma. Eu queria is a softer, polite way to ask.' },
        { learner: 'Uma copo de água.', alternative: 'Um copo de água.', explanation: 'Copo is masculine, so use um.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: ['A conta, por favor.', 'Quanto é?', 'Posso pagar com cartão?', 'Estava delicioso.', 'Muito obrigado.'],
      dialogue: ['Você gostaria de mais alguma coisa?', 'Não, obrigado. A conta, por favor.', 'Aqui está. São vinte dólares.', 'Posso pagar com cartão?'],
      prompts: ['Você gostaria de mais alguma coisa?', 'Como estava a comida?'],
      grammar: {
        point: 'Use Posso plus an infinitive to ask whether you may do something. Obrigado is said by a man and obrigada by a woman.',
        examples: [
          { text: 'Posso pagar com cartão?', english: 'Can I pay by card?' },
          { text: 'Posso ver o cardápio?', english: 'Can I see the menu?' },
        ],
      },
      errors: [
        { learner: 'Posso pago com cartão?', alternative: 'Posso pagar com cartão?', explanation: 'After posso, use the infinitive pagar.' },
        { learner: 'O conta, por favor.', alternative: 'A conta, por favor.', explanation: 'Conta is feminine, so use a.' },
      ],
    },
  },
});
