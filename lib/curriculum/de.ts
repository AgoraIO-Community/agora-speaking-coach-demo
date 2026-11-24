import { definePack } from './skeleton';

export const de = definePack({
  id: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  voice: 'German_SweetLady',
  lessons: {
    'introduce-yourself': {
      vocabulary: ['Hallo.', 'Ich heiße Alex.', 'Ich wohne in Boston.', 'Schön, Sie kennenzulernen.', 'Und Sie?'],
      dialogue: ['Hallo! Wie heißen Sie?', 'Hallo, ich heiße Alex.', 'Wo wohnen Sie?', 'Ich wohne in Boston. Schön, Sie kennenzulernen.'],
      prompts: ['Wie heißen Sie?', 'Wo wohnen Sie?'],
      grammar: {
        point: 'With ich, the verb ends in -e: wohnen becomes ich wohne and heißen becomes ich heiße.',
        examples: [
          { text: 'Ich wohne in Boston.', english: 'I live in Boston.' },
          { text: 'Ich heiße Alex.', english: 'My name is Alex.' },
        ],
      },
      errors: [
        { learner: 'Ich wohnen in Boston.', alternative: 'Ich wohne in Boston.', explanation: 'Use wohne with ich.' },
        { learner: 'Ich bin heiße Alex.', alternative: 'Ich heiße Alex.', explanation: 'Heiße already means am called, so leave out bin.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: ['Haben Sie heute Zeit?', 'Können wir das Projekt besprechen?', 'Ich glaube, wir können morgen anfangen.', 'Könnten Sie das bitte wiederholen?', 'Danke.'],
      dialogue: ['Haben Sie heute Zeit?', 'Ja. Können wir das Projekt besprechen?', 'Natürlich. Wann können wir anfangen?', 'Ich glaube, wir können morgen anfangen.'],
      prompts: ['Haben Sie heute Zeit?', 'Wann können wir anfangen?'],
      grammar: {
        point: 'With können, the second verb goes to the end of the sentence in the infinitive.',
        examples: [
          { text: 'Wir können morgen anfangen.', english: 'We can start tomorrow.' },
          { text: 'Können wir das Projekt besprechen?', english: 'Can we discuss the project?' },
        ],
      },
      errors: [
        { learner: 'Wir kann morgen anfangen.', alternative: 'Wir können morgen anfangen.', explanation: 'Use können with wir.' },
        { learner: 'Wir können anfangen morgen.', alternative: 'Wir können morgen anfangen.', explanation: 'The infinitive anfangen goes to the end of the sentence.' },
      ],
    },
    'order-a-meal': {
      vocabulary: ['Die Speisekarte, bitte.', 'Ich hätte gern eine Suppe, bitte.', 'Bitte nicht scharf.', 'Ein Glas Wasser, bitte.', 'Was empfehlen Sie?'],
      dialogue: ['Was möchten Sie bestellen?', 'Ich hätte gern eine Suppe, bitte.', 'Möchten Sie etwas trinken?', 'Ein Glas Wasser, bitte.'],
      prompts: ['Was möchten Sie bestellen?', 'Möchten Sie etwas trinken?'],
      grammar: {
        point: 'Nouns have gender. When ordering, use eine with feminine nouns such as Suppe and ein with neuter nouns such as Glas.',
        examples: [
          { text: 'eine Suppe', english: 'a soup' },
          { text: 'ein Glas Wasser', english: 'a glass of water' },
        ],
      },
      errors: [
        { learner: 'Ich möchte ein Suppe.', alternative: 'Ich möchte eine Suppe.', explanation: 'Suppe is feminine, so use eine. Ich hätte gern is another polite way to ask.' },
        { learner: 'Eine Glas Wasser, bitte.', alternative: 'Ein Glas Wasser, bitte.', explanation: 'Glas is neuter, so use ein.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: ['Die Rechnung, bitte.', 'Was kostet das?', 'Kann ich mit Karte zahlen?', 'Es war sehr lecker.', 'Vielen Dank.'],
      dialogue: ['Möchten Sie noch etwas?', 'Nein, danke. Die Rechnung, bitte.', 'Bitte sehr. Das macht zwanzig Dollar.', 'Kann ich mit Karte zahlen?'],
      prompts: ['Möchten Sie noch etwas?', 'Wie war das Essen?'],
      grammar: {
        point: 'Use Kann ich with the infinitive at the end to ask whether you may do something.',
        examples: [
          { text: 'Kann ich mit Karte zahlen?', english: 'Can I pay by card?' },
          { text: 'Kann ich die Speisekarte sehen?', english: 'Can I see the menu?' },
        ],
      },
      errors: [
        { learner: 'Kann ich zahlen mit Karte?', alternative: 'Kann ich mit Karte zahlen?', explanation: 'The infinitive zahlen goes to the end of the question.' },
        { learner: 'Der Rechnung, bitte.', alternative: 'Die Rechnung, bitte.', explanation: 'Rechnung is feminine, so use die.' },
      ],
    },
  },
});
