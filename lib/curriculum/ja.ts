import { definePack, type Text } from './skeleton';

const r = (text: string, reading: string): Text => ({ text, reading });

export const ja = definePack({
  id: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  voice: 'Japanese_KindLady',
  recognitionLocale: 'ja-JP',
  romanization: 'Hepburn romanization',
  lessons: {
    'introduce-yourself': {
      sampleName: r('アレックス', 'Arekkusu'),
      vocabulary: [
        r('こんにちは。', 'Konnichiwa.'),
        r('{name}です。', '{name} desu.'),
        r('ボストンに住んでいます。', 'Bosuton ni sunde imasu.'),
        r('はじめまして。', 'Hajimemashite.'),
        r('あなたは？', 'Anata wa?'),
      ],
      dialogue: [
        r('こんにちは！お名前は何ですか。', 'Konnichiwa! Onamae wa nan desu ka.'),
        r('こんにちは、{name}です。', 'Konnichiwa, {name} desu.'),
        r('どこに住んでいますか。', 'Doko ni sunde imasu ka.'),
        r('ボストンに住んでいます。よろしくお願いします。', 'Bosuton ni sunde imasu. Yoroshiku onegai shimasu.'),
      ],
      prompts: [
        r('お名前は何ですか。', 'Onamae wa nan desu ka.'),
        r('どこに住んでいますか。', 'Doko ni sunde imasu ka.'),
      ],
      grammar: {
        point: 'The particle に marks the place where you live with 住んでいます. です ends a polite sentence.',
        examples: [
          { text: r('ボストンに住んでいます。', 'Bosuton ni sunde imasu.'), english: 'I live in Boston.' },
          { text: r('{name}です。', '{name} desu.'), english: 'I am {name}.' },
        ],
      },
      errors: [
        { learner: 'ボストンで住んでいます。', alternative: 'ボストンに住んでいます。', explanation: 'Use the particle に with 住んでいます to say where you live.' },
        { learner: '私は{name}。', alternative: '私は{name}です。', explanation: 'Add です to make the sentence polite.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: [
        r('今日、お時間はありますか。', 'Kyō, ojikan wa arimasu ka.'),
        r('プロジェクトを確認できますか。', 'Purojekuto o kakunin dekimasu ka.'),
        r('明日から始められると思います。', 'Ashita kara hajimerareru to omoimasu.'),
        r('もう一度言っていただけますか。', 'Mō ichido itte itadakemasu ka.'),
        r('ありがとうございます。', 'Arigatō gozaimasu.'),
      ],
      dialogue: [
        r('今日、お時間はありますか。', 'Kyō, ojikan wa arimasu ka.'),
        r('はい。プロジェクトを確認できますか。', 'Hai. Purojekuto o kakunin dekimasu ka.'),
        r('もちろんです。いつから始められますか。', 'Mochiron desu. Itsu kara hajimeraremasu ka.'),
        r('明日から始められると思います。', 'Ashita kara hajimerareru to omoimasu.'),
      ],
      prompts: [
        r('今日、お時間はありますか。', 'Kyō, ojikan wa arimasu ka.'),
        r('いつから始められますか。', 'Itsu kara hajimeraremasu ka.'),
      ],
      grammar: {
        point: 'できます means can do. Add it after a noun such as 確認, or use a potential verb form such as 始められます.',
        examples: [
          { text: r('確認できます。', 'Kakunin dekimasu.'), english: 'I can check.' },
          { text: r('明日から始められます。', 'Ashita kara hajimeraremasu.'), english: 'We can start from tomorrow.' },
        ],
      },
      errors: [
        { learner: '明日から始めるできます。', alternative: '明日から始められます。', explanation: 'Use the potential form 始められます instead of adding できます to the verb.' },
        { learner: 'もう一度言うください。', alternative: 'もう一度言ってください。', explanation: 'Use the て form 言って before ください.' },
      ],
    },
    'order-a-meal': {
      vocabulary: [
        r('メニューをお願いします。', 'Menyū o onegai shimasu.'),
        r('スープをお願いします。', 'Sūpu o onegai shimasu.'),
        r('辛くしないでください。', 'Karaku shinaide kudasai.'),
        r('お水を一杯お願いします。', 'Omizu o ippai onegai shimasu.'),
        r('おすすめは何ですか。', 'Osusume wa nan desu ka.'),
      ],
      dialogue: [
        r('ご注文は何になさいますか。', 'Gochūmon wa nani ni nasaimasu ka.'),
        r('スープをお願いします。', 'Sūpu o onegai shimasu.'),
        r('お飲み物はいかがですか。', 'Onomimono wa ikaga desu ka.'),
        r('お水を一杯お願いします。', 'Omizu o ippai onegai shimasu.'),
      ],
      prompts: [
        r('ご注文は何になさいますか。', 'Gochūmon wa nani ni nasaimasu ka.'),
        r('お飲み物はいかがですか。', 'Onomimono wa ikaga desu ka.'),
      ],
      grammar: {
        point: 'To ask for something politely, name it, add the particle を and finish with お願いします.',
        examples: [
          { text: r('スープをお願いします。', 'Sūpu o onegai shimasu.'), english: 'A soup, please.' },
          { text: r('メニューをお願いします。', 'Menyū o onegai shimasu.'), english: 'The menu, please.' },
        ],
      },
      errors: [
        { learner: 'スープがお願いします。', alternative: 'スープをお願いします。', explanation: 'Use the particle を before お願いします for the thing you are asking for.' },
        { learner: '辛いしないでください。', alternative: '辛くしないでください。', explanation: 'Change 辛い to 辛く before しないでください.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: [
        r('お会計をお願いします。', 'Okaikei o onegai shimasu.'),
        r('いくらですか。', 'Ikura desu ka.'),
        r('カードで払えますか。', 'Kādo de haraemasu ka.'),
        r('おいしかったです。', 'Oishikatta desu.'),
        r('ありがとうございました。', 'Arigatō gozaimashita.'),
      ],
      dialogue: [
        r('ほかにご注文はありますか。', 'Hoka ni gochūmon wa arimasu ka.'),
        r('いいえ、大丈夫です。お会計をお願いします。', 'Iie, daijōbu desu. Okaikei o onegai shimasu.'),
        r('はい、二十ドルです。', 'Hai, nijū doru desu.'),
        r('カードで払えますか。', 'Kādo de haraemasu ka.'),
      ],
      prompts: [
        r('ほかにご注文はありますか。', 'Hoka ni gochūmon wa arimasu ka.'),
        r('お食事はいかがでしたか。', 'Oshokuji wa ikaga deshita ka.'),
      ],
      grammar: {
        point: 'The particle で marks the means you use to do something, as in カードで.',
        examples: [
          { text: r('カードで払えますか。', 'Kādo de haraemasu ka.'), english: 'Can I pay by card?' },
          { text: r('現金で払います。', 'Genkin de haraimasu.'), english: 'I will pay in cash.' },
        ],
      },
      errors: [
        { learner: 'カードに払えますか。', alternative: 'カードで払えますか。', explanation: 'Use the particle で for the means of payment.' },
        { learner: 'おいしいでした。', alternative: 'おいしかったです。', explanation: 'For the past of おいしい, say おいしかったです.' },
      ],
    },
  },
});
