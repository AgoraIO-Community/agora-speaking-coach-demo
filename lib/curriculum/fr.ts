import { definePack } from './skeleton';

export const fr = definePack({
  id: 'fr',
  name: 'French',
  nativeName: 'Français',
  voice: 'French_MovieLeadFemale',
  lessons: {
    'introduce-yourself': {
      vocabulary: ['Bonjour.', 'Je m’appelle Alex.', 'J’habite à Boston.', 'Enchanté de vous rencontrer.', 'Et vous ?'],
      dialogue: ['Bonjour ! Comment vous appelez-vous ?', 'Bonjour, je m’appelle Alex.', 'Où habitez-vous ?', 'J’habite à Boston. Enchanté de vous rencontrer.'],
      prompts: ['Comment vous appelez-vous ?', 'Où habitez-vous ?'],
      grammar: {
        point: 'Je shortens to j’ before a vowel sound, and the verb takes the je form: habiter becomes habite.',
        examples: [
          { text: 'J’habite à Boston.', english: 'I live in Boston.' },
          { text: 'Je m’appelle Alex.', english: 'My name is Alex.' },
        ],
      },
      errors: [
        { learner: 'Je habiter à Boston.', alternative: 'J’habite à Boston.', explanation: 'Use habite with je. Je shortens to j’ before a vowel sound.' },
        { learner: 'J’habite en Boston.', alternative: 'J’habite à Boston.', explanation: 'Use à before the name of a city.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: ['Avez-vous un moment aujourd’hui ?', 'Pouvons-nous faire le point sur le projet ?', 'Je pense que nous pouvons commencer demain.', 'Pourriez-vous répéter, s’il vous plaît ?', 'Merci.'],
      dialogue: ['Avez-vous un moment aujourd’hui ?', 'Oui. Pouvons-nous faire le point sur le projet ?', 'Bien sûr. Quand pouvons-nous commencer ?', 'Je pense que nous pouvons commencer demain.'],
      prompts: ['Avez-vous un moment aujourd’hui ?', 'Quand pouvons-nous commencer ?'],
      grammar: {
        point: 'Pouvoir plus an infinitive says what someone can do. Use pouvons with nous and pouvez with vous.',
        examples: [
          { text: 'Nous pouvons commencer demain.', english: 'We can start tomorrow.' },
          { text: 'Pouvez-vous répéter ?', english: 'Can you repeat?' },
        ],
      },
      errors: [
        { learner: 'Nous peut commencer demain.', alternative: 'Nous pouvons commencer demain.', explanation: 'Use pouvons with nous.' },
        { learner: 'Nous pouvons commençons demain.', alternative: 'Nous pouvons commencer demain.', explanation: 'After pouvons, keep the second verb in the infinitive: commencer.' },
      ],
    },
    'order-a-meal': {
      vocabulary: ['La carte, s’il vous plaît.', 'Je voudrais une soupe, s’il vous plaît.', 'Pas épicé, s’il vous plaît.', 'Un verre d’eau, s’il vous plaît.', 'Que recommandez-vous ?'],
      dialogue: ['Que souhaitez-vous commander ?', 'Je voudrais une soupe, s’il vous plaît.', 'Voulez-vous quelque chose à boire ?', 'Un verre d’eau, s’il vous plaît.'],
      prompts: ['Que souhaitez-vous commander ?', 'Voulez-vous quelque chose à boire ?'],
      grammar: {
        point: 'Nouns have gender. Use une with feminine nouns such as soupe and un with masculine nouns such as verre.',
        examples: [
          { text: 'une soupe', english: 'a soup' },
          { text: 'un verre d’eau', english: 'a glass of water' },
        ],
      },
      errors: [
        { learner: 'Je veux un soupe.', alternative: 'Je voudrais une soupe.', explanation: 'Soupe is feminine, so use une. Je voudrais is more polite than je veux.' },
        { learner: 'Un verre de eau.', alternative: 'Un verre d’eau.', explanation: 'De shortens to d’ before a vowel sound.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: ['L’addition, s’il vous plaît.', 'C’est combien ?', 'Puis-je payer par carte ?', 'C’était délicieux.', 'Merci beaucoup.'],
      dialogue: ['Désirez-vous autre chose ?', 'Non, merci. L’addition, s’il vous plaît.', 'Voici. Cela fait vingt dollars.', 'Puis-je payer par carte ?'],
      prompts: ['Désirez-vous autre chose ?', 'Comment était le repas ?'],
      grammar: {
        point: 'Use Puis-je plus an infinitive to ask politely whether you may do something. Est-ce que je peux is a common everyday alternative.',
        examples: [
          { text: 'Puis-je payer par carte ?', english: 'May I pay by card?' },
          { text: 'Est-ce que je peux voir la carte ?', english: 'Can I see the menu?' },
        ],
      },
      errors: [
        { learner: 'Puis-je paie par carte ?', alternative: 'Puis-je payer par carte ?', explanation: 'After puis-je, use the infinitive payer.' },
        { learner: 'La addition, s’il vous plaît.', alternative: 'L’addition, s’il vous plaît.', explanation: 'La shortens to l’ before a vowel sound.' },
      ],
    },
  },
});
