export type EmojiItem = { char: string; keywords: string[] };
export type EmojiCategory = { id: string; name: string; emojis: EmojiItem[] };

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const SPECIAL_KEYWORDS: Record<string, string[]> = {
  '⚽': ['soccer', 'calcio', 'football'],
  '🏀': ['basket', 'basketball'],
  '🏐': ['volleyball', 'pallavolo'],
  '🎾': ['tennis'],
  '🏆': ['trophy', 'coppa'],
  '🎯': ['target', 'bersaglio'],
  '🏅': ['medal', 'medaglia'],
  '🍕': ['pizza'],
  '🍔': ['burger'],
  '🍣': ['sushi'],
  '🍝': ['pasta'],
  '☕': ['coffee', 'caffe'],
  '🍺': ['beer', 'birra'],
  '✈️': ['flight', 'aereo'],
  '🚗': ['car', 'auto'],
  '🚆': ['train', 'treno'],
  '🏖️': ['beach', 'spiaggia'],
  '🎵': ['music', 'musica'],
  '❤️': ['love', 'cuore'],
  '🔥': ['fire'],
};

function buildEmojiFromRanges(ranges: Array<[number, number]>, keywords: string[]) {
  const result: EmojiItem[] = [];
  ranges.forEach(([start, end]) => {
    for (let code = start; code <= end; code += 1) {
      const char = String.fromCodePoint(code);
      if (!EMOJI_REGEX.test(char)) continue;
      const extra = SPECIAL_KEYWORDS[char];
      result.push({ char, keywords: extra ? [...keywords, ...extra] : keywords });
    }
  });
  return result;
}

function buildEmojiList(chars: string[], keywords: string[]) {
  return chars.map((char) => ({
    char,
    keywords: SPECIAL_KEYWORDS[char] ? [...keywords, ...SPECIAL_KEYWORDS[char]] : keywords,
  }));
}

const GESTURE_EMOJIS = [
  '👍',
  '👎',
  '👏',
  '🙌',
  '🙏',
  '🤝',
  '👌',
  '✌️',
  '🤞',
  '🤟',
  '🤘',
  '🤙',
  '🫶',
  '🫱',
  '🫲',
  '🫳',
  '🫴',
  '👊',
  '✊',
  '🤛',
  '🤜',
  '🤚',
  '✋',
  '🖐️',
  '🖖',
  '🫰',
  '👉',
  '👈',
  '👆',
  '👇',
  '☝️',
  '🫵',
  '🤌',
];

const FLAG_EMOJIS = [
  '🇮🇹',
  '🇺🇸',
  '🇬🇧',
  '🇫🇷',
  '🇩🇪',
  '🇪🇸',
  '🇵🇹',
  '🇨🇭',
  '🇳🇱',
  '🇧🇪',
  '🇦🇺',
  '🇨🇦',
  '🇧🇷',
  '🇦🇷',
  '🇲🇽',
  '🇯🇵',
  '🇨🇳',
  '🇮🇳',
  '🇰🇷',
  '🇸🇦',
  '🇦🇪',
  '🇷🇺',
  '🇺🇦',
  '🇸🇪',
  '🇳🇴',
  '🇩🇰',
  '🇵🇱',
  '🇦🇹',
  '🇬🇷',
  '🇹🇷',
  '🇮🇪',
  '🇮🇸',
  '🇵🇰',
  '🇸🇬',
  '🇲🇾',
];

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'recent', name: 'Recenti', emojis: [] },
  {
    id: 'smileys',
    name: 'Smileys',
    emojis: buildEmojiFromRanges(
      [
        [0x1f600, 0x1f64f],
        [0x1f910, 0x1f94f],
      ],
      ['smileys', 'face'],
    ),
  },
  {
    id: 'gestures',
    name: 'Gesti',
    emojis: buildEmojiList(GESTURE_EMOJIS, ['gesti', 'hands']),
  },
  {
    id: 'people',
    name: 'Persone',
    emojis: buildEmojiFromRanges(
      [
        [0x1f466, 0x1f487],
        [0x1f9d1, 0x1f9ff],
      ],
      ['people', 'persone'],
    ),
  },
  {
    id: 'animals',
    name: 'Animali',
    emojis: buildEmojiFromRanges(
      [
        [0x1f400, 0x1f43f],
        [0x1f980, 0x1f9a5],
      ],
      ['animals', 'animali'],
    ),
  },
  {
    id: 'food',
    name: 'Cibo',
    emojis: buildEmojiFromRanges(
      [
        [0x1f340, 0x1f37f],
        [0x1f950, 0x1f96f],
      ],
      ['food', 'cibo'],
    ),
  },
  {
    id: 'activities',
    name: 'Attività',
    emojis: buildEmojiFromRanges([[0x1f3a0, 0x1f3ff]], ['activity', 'attivita']),
  },
  {
    id: 'travel',
    name: 'Viaggi',
    emojis: buildEmojiFromRanges(
      [
        [0x1f300, 0x1f320],
        [0x1f680, 0x1f6ff],
      ],
      ['travel', 'viaggi'],
    ),
  },
  {
    id: 'objects',
    name: 'Oggetti',
    emojis: buildEmojiFromRanges(
      [
        [0x1f4a0, 0x1f4ff],
        [0x1f500, 0x1f52f],
        [0x1f9e0, 0x1f9ff],
      ],
      ['objects', 'oggetti'],
    ),
  },
  {
    id: 'symbols',
    name: 'Simboli',
    emojis: buildEmojiFromRanges(
      [
        [0x2600, 0x26ff],
        [0x2700, 0x27bf],
        [0x1f7e0, 0x1f7ff],
      ],
      ['symbols', 'simboli'],
    ),
  },
  {
    id: 'flags',
    name: 'Bandiere',
    emojis: buildEmojiList(FLAG_EMOJIS, ['flags', 'bandiere']),
  },
];
