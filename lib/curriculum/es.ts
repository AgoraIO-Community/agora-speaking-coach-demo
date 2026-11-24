import { definePack } from './skeleton';

export const es = definePack({
  id: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  voice: 'Spanish_SereneWoman',
  lessons: {
    'introduce-yourself': {
      vocabulary: ['Hola.', 'Me llamo Alex.', 'Vivo en Boston.', 'Mucho gusto.', '¿Y tú?'],
      dialogue: ['¡Hola! ¿Cómo te llamas?', 'Hola, me llamo Alex.', '¿Dónde vives?', 'Vivo en Boston. Mucho gusto.'],
      prompts: ['¿Cómo te llamas?', '¿Dónde vives?'],
      grammar: {
        point: 'Verbs change their ending for I. Vivir becomes vivo, and the subject yo is usually left out.',
        examples: [
          { text: 'Vivo en Boston.', english: 'I live in Boston.' },
          { text: 'Me llamo Alex.', english: 'My name is Alex.' },
        ],
      },
      errors: [
        { learner: 'Yo vivir en Boston.', alternative: 'Vivo en Boston.', explanation: 'Use vivo for I live. The subject yo is optional here.' },
        { learner: 'Mi llamo Alex.', alternative: 'Me llamo Alex.', explanation: 'Use me, not mi, with llamo.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: ['¿Tienes tiempo hoy?', '¿Podemos revisar el proyecto?', 'Creo que podemos empezar mañana.', '¿Puedes repetirlo, por favor?', 'Gracias.'],
      dialogue: ['¿Tienes tiempo hoy?', 'Sí. ¿Podemos revisar el proyecto?', 'Claro. ¿Cuándo podemos empezar?', 'Creo que podemos empezar mañana.'],
      prompts: ['¿Tienes tiempo hoy?', '¿Cuándo podemos empezar?'],
      grammar: {
        point: 'Poder plus an infinitive says what someone can do. Use podemos for we can and puedes for you can.',
        examples: [
          { text: 'Podemos empezar mañana.', english: 'We can start tomorrow.' },
          { text: '¿Puedes repetirlo?', english: 'Can you repeat it?' },
        ],
      },
      errors: [
        { learner: 'Nosotros puede empezar mañana.', alternative: 'Podemos empezar mañana.', explanation: 'Use podemos with nosotros. You can omit nosotros when the meaning is clear.' },
        { learner: 'Podemos revisamos el proyecto.', alternative: 'Podemos revisar el proyecto.', explanation: 'After podemos, keep the second verb in the infinitive: revisar.' },
      ],
    },
    'order-a-meal': {
      vocabulary: ['La carta, por favor.', 'Quisiera una sopa, por favor.', 'Sin picante, por favor.', 'Un vaso de agua, por favor.', '¿Qué me recomienda?'],
      dialogue: ['¿Qué le gustaría pedir?', 'Quisiera una sopa, por favor.', '¿Le gustaría algo de beber?', 'Un vaso de agua, por favor.'],
      prompts: ['¿Qué le gustaría pedir?', '¿Le gustaría algo de beber?'],
      grammar: {
        point: 'Nouns have gender. Use una with feminine nouns such as sopa and un with masculine nouns such as vaso.',
        examples: [
          { text: 'una sopa', english: 'a soup' },
          { text: 'un vaso de agua', english: 'a glass of water' },
        ],
      },
      errors: [
        { learner: 'Quiero un sopa.', alternative: 'Quiero una sopa.', explanation: 'Sopa is feminine, so use una. Quisiera is another polite way to ask.' },
        { learner: 'Una vaso de agua.', alternative: 'Un vaso de agua.', explanation: 'Vaso is masculine, so use un.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: ['La cuenta, por favor.', '¿Cuánto es?', '¿Puedo pagar con tarjeta?', 'Estuvo delicioso.', 'Muchas gracias.'],
      dialogue: ['¿Desea algo más?', 'No, gracias. La cuenta, por favor.', 'Aquí tiene. Son veinte dólares.', '¿Puedo pagar con tarjeta?'],
      prompts: ['¿Desea algo más?', '¿Qué tal la comida?'],
      grammar: {
        point: 'Use ¿Puedo plus an infinitive? to ask whether you may do something.',
        examples: [
          { text: '¿Puedo pagar con tarjeta?', english: 'Can I pay by card?' },
          { text: '¿Puedo ver la carta?', english: 'Can I see the menu?' },
        ],
      },
      errors: [
        { learner: '¿Puedo pago con tarjeta?', alternative: '¿Puedo pagar con tarjeta?', explanation: 'After puedo, use the infinitive pagar.' },
        { learner: 'El cuenta, por favor.', alternative: 'La cuenta, por favor.', explanation: 'Cuenta is feminine, so use la.' },
      ],
    },
  },
});
