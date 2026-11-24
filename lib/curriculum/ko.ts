import { definePack, type Text } from './skeleton';

const r = (text: string, reading: string): Text => ({ text, reading });

export const ko = definePack({
  id: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  voice: 'Korean_SoothingLady',
  romanization: 'Revised Romanization of Korean',
  lessons: {
    'introduce-yourself': {
      vocabulary: [
        r('안녕하세요.', 'Annyeonghaseyo.'),
        r('저는 알렉스예요.', 'Jeoneun Allekseuyeyo.'),
        r('저는 보스턴에 살아요.', 'Jeoneun Boseuteone sarayo.'),
        r('만나서 반갑습니다.', 'Mannaseo bangapseumnida.'),
        r('그쪽은요?', 'Geujjogeunyo?'),
      ],
      dialogue: [
        r('안녕하세요! 이름이 뭐예요?', 'Annyeonghaseyo! Ireumi mwoyeyo?'),
        r('안녕하세요, 저는 알렉스예요.', 'Annyeonghaseyo, jeoneun Allekseuyeyo.'),
        r('어디에 살아요?', 'Eodie sarayo?'),
        r('저는 보스턴에 살아요. 만나서 반갑습니다.', 'Jeoneun Boseuteone sarayo. Mannaseo bangapseumnida.'),
      ],
      prompts: [
        r('이름이 뭐예요?', 'Ireumi mwoyeyo?'),
        r('어디에 살아요?', 'Eodie sarayo?'),
      ],
      grammar: {
        point: 'The particle 에 marks the place where you live with 살아요.',
        examples: [
          { text: r('보스턴에 살아요.', 'Boseuteone sarayo.'), english: 'I live in Boston.' },
          { text: r('어디에 살아요?', 'Eodie sarayo?'), english: 'Where do you live?' },
        ],
      },
      errors: [
        { learner: '저는 보스턴을 살아요.', alternative: '저는 보스턴에 살아요.', explanation: 'Use the particle 에 with 살아요 to say where you live.' },
        { learner: '저는 알렉스이에요.', alternative: '저는 알렉스예요.', explanation: 'After a name ending in a vowel, use 예요.' },
      ],
    },
    'talk-with-a-colleague': {
      vocabulary: [
        r('오늘 시간 있으세요?', 'Oneul sigan isseuseyo?'),
        r('프로젝트를 검토할 수 있을까요?', 'Peurojekteureul geomtohal su isseulkkayo?'),
        r('내일 시작할 수 있을 것 같아요.', 'Naeil sijakhal su isseul geot gatayo.'),
        r('다시 한번 말씀해 주시겠어요?', 'Dasi hanbeon malsseumhae jusigesseoyo?'),
        r('감사합니다.', 'Gamsahamnida.'),
      ],
      dialogue: [
        r('오늘 시간 있으세요?', 'Oneul sigan isseuseyo?'),
        r('네. 프로젝트를 검토할 수 있을까요?', 'Ne. Peurojekteureul geomtohal su isseulkkayo?'),
        r('물론이죠. 언제 시작할 수 있어요?', 'Mullonijyo. Eonje sijakhal su isseoyo?'),
        r('내일 시작할 수 있을 것 같아요.', 'Naeil sijakhal su isseul geot gatayo.'),
      ],
      prompts: [
        r('오늘 시간 있으세요?', 'Oneul sigan isseuseyo?'),
        r('언제 시작할 수 있어요?', 'Eonje sijakhal su isseoyo?'),
      ],
      grammar: {
        point: 'Add ㄹ 수 있어요 or 을 수 있어요 to a verb stem to say that someone can do something.',
        examples: [
          { text: r('시작할 수 있어요.', 'Sijakhal su isseoyo.'), english: 'I can start.' },
          { text: r('검토할 수 있어요.', 'Geomtohal su isseoyo.'), english: 'I can review it.' },
        ],
      },
      errors: [
        { learner: '내일 시작할 수 있어 같아요.', alternative: '내일 시작할 수 있을 것 같아요.', explanation: 'Use 을 것 같아요 after the verb stem to say that something seems likely.' },
        { learner: '시작하다 수 있어요.', alternative: '시작할 수 있어요.', explanation: 'Attach ㄹ 수 있어요 to the stem 시작하, not to the dictionary form.' },
      ],
    },
    'order-a-meal': {
      vocabulary: [
        r('메뉴판 주세요.', 'Menyupan juseyo.'),
        r('수프 하나 주세요.', 'Supeu hana juseyo.'),
        r('맵지 않게 해 주세요.', 'Maepji anke hae juseyo.'),
        r('물 한 잔 주세요.', 'Mul han jan juseyo.'),
        r('뭘 추천하세요?', 'Mwol chucheonhaseyo?'),
      ],
      dialogue: [
        r('무엇을 주문하시겠어요?', 'Mueoseul jumunhasigesseoyo?'),
        r('수프 하나 주세요.', 'Supeu hana juseyo.'),
        r('음료는 뭐로 하시겠어요?', 'Eumnyoneun mworo hasigesseoyo?'),
        r('물 한 잔 주세요.', 'Mul han jan juseyo.'),
      ],
      prompts: [
        r('무엇을 주문하시겠어요?', 'Mueoseul jumunhasigesseoyo?'),
        r('음료는 뭐로 하시겠어요?', 'Eumnyoneun mworo hasigesseoyo?'),
      ],
      grammar: {
        point: 'To ask for something politely, name it and add 주세요.',
        examples: [
          { text: r('수프 하나 주세요.', 'Supeu hana juseyo.'), english: 'One soup, please.' },
          { text: r('물 한 잔 주세요.', 'Mul han jan juseyo.'), english: 'A glass of water, please.' },
        ],
      },
      errors: [
        { learner: '수프 하나 주다.', alternative: '수프 하나 주세요.', explanation: 'Use the polite request form 주세요 instead of the dictionary form 주다.' },
        { learner: '물 하나 잔 주세요.', alternative: '물 한 잔 주세요.', explanation: 'Before a counter such as 잔, 하나 shortens to 한.' },
      ],
    },
    'ask-for-the-check': {
      vocabulary: [
        r('계산서 주세요.', 'Gyesanseo juseyo.'),
        r('얼마예요?', 'Eolmayeyo?'),
        r('카드로 계산할 수 있어요?', 'Kadeuro gyesanhal su isseoyo?'),
        r('맛있었어요.', 'Masisseosseoyo.'),
        r('정말 감사합니다.', 'Jeongmal gamsahamnida.'),
      ],
      dialogue: [
        r('더 필요한 것 있으세요?', 'Deo piryohan geot isseuseyo?'),
        r('아니요, 괜찮아요. 계산서 주세요.', 'Aniyo, gwaenchanayo. Gyesanseo juseyo.'),
        r('여기 있습니다. 이십 달러입니다.', 'Yeogi itseumnida. Isip dalleoimnida.'),
        r('카드로 계산할 수 있어요?', 'Kadeuro gyesanhal su isseoyo?'),
      ],
      prompts: [
        r('더 필요한 것 있으세요?', 'Deo piryohan geot isseuseyo?'),
        r('식사는 어떠셨어요?', 'Siksaneun eotteosyeosseoyo?'),
      ],
      grammar: {
        point: 'The particle 로 or 으로 marks the means you use to do something, as in 카드로.',
        examples: [
          { text: r('카드로 계산할 수 있어요?', 'Kadeuro gyesanhal su isseoyo?'), english: 'Can I pay by card?' },
          { text: r('현금으로 계산할게요.', 'Hyeongeumeuro gyesanhalgeyo.'), english: 'I will pay in cash.' },
        ],
      },
      errors: [
        { learner: '카드에 계산할 수 있어요?', alternative: '카드로 계산할 수 있어요?', explanation: 'Use the particle 로 for the means of payment.' },
        { learner: '얼마이에요?', alternative: '얼마예요?', explanation: 'After a word ending in a vowel, use 예요.' },
      ],
    },
  },
});
