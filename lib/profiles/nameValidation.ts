const DISALLOWED_PERSON_NAME_CHARS = /[^\p{L}\p{M}\s.'’-]/gu;
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'’-]+$/u;

export function sanitizeProfilePersonName(value: string) {
  return value.replace(DISALLOWED_PERSON_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

export function isValidProfilePersonName(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && PERSON_NAME_PATTERN.test(trimmed);
}


const DISALLOWED_CLUB_NAME_CHARS = /[^\p{L}\p{M}\p{N}\s,.'’-]/gu;
const CLUB_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s,.'’-]+$/u;
const CLUB_ORGANIZATION_KEYWORDS = new Set([
  'academy',
  'accademia',
  'ac',
  'asd',
  'associazione',
  'atletico',
  'athletic',
  'basket',
  'calcio',
  'club',
  'fc',
  'polisportiva',
  'real',
  'rugby',
  'sc',
  'societa',
  'società',
  'sport',
  'sporting',
  'ssd',
  'ss',
  'team',
  'tennis',
  'uc',
  'unione',
  'united',
  'us',
  'volley',
]);
const PERSON_LIKE_NAME_PATTERN = /^\p{Lu}[\p{Ll}\p{M}'’-]+(?:\s+\p{Lu}[\p{Ll}\p{M}'’-]+){1,2}$/u;

export function sanitizeProfileClubName(value: string) {
  return value.replace(DISALLOWED_CLUB_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

export function isValidProfileClubName(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && CLUB_NAME_PATTERN.test(trimmed);
}

function normalizeKeyword(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function getProfileClubNameValidationError(value: string) {
  const trimmed = value.trim();
  if (!isValidProfileClubName(trimmed)) {
    return 'Il campo Nome del club può contenere solo lettere, numeri, spazi, apostrofo, virgola, punto e trattino';
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const hasClubKeyword = tokens.some((token) =>
    CLUB_ORGANIZATION_KEYWORDS.has(normalizeKeyword(token.replace(/[.,]/g, ''))),
  );
  const hasOrganizationSignal = hasClubKeyword || /\d/.test(trimmed) || /[.,]/.test(trimmed);

  if (!hasOrganizationSignal && PERSON_LIKE_NAME_PATTERN.test(trimmed)) {
    return 'Inserisci la denominazione della società, non nome e cognome di una persona. Esempio: "ASD Club Atlético Carlentini"';
  }

  return null;
}
