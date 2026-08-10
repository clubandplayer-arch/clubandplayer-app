const DISALLOWED_PERSON_NAME_CHARS = /[^\p{L}\p{M}\s.'’-]/gu;
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'’-]+$/u;

export function sanitizeProfilePersonName(value: string) {
  return value.replace(DISALLOWED_PERSON_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

function capitalizeNamePart(value: string) {
  const characters = Array.from(value.toLocaleLowerCase('it-IT'));
  if (characters.length === 0) return '';
  return characters[0].toLocaleUpperCase('it-IT') + characters.slice(1).join('');
}

/** Normalizes personal names to `Nome Cognome` casing, including D'Angelo and Di Giacomo. */
export function normalizeProfilePersonName(value: string) {
  return sanitizeProfilePersonName(value)
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => word.split(/([.'’-])/u).map(capitalizeNamePart).join(''))
    .join(' ');
}

export function isValidProfilePersonName(value: string) {
  const trimmed = value.trim();
  const words = trimmed.split(/\s+/u).filter(Boolean);
  return (
    trimmed.length > 0 &&
    PERSON_NAME_PATTERN.test(trimmed) &&
    words.length >= 2 &&
    words.every((word) => (word.match(/\p{L}/gu) ?? []).length >= 2)
  );
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
const PERSON_LIKE_NAME_PATTERN = /^[\p{L}\p{M}'’-]+(?:\s+[\p{L}\p{M}'’-]+){0,2}$/u;

export function sanitizeProfileClubName(value: string) {
  return value.replace(DISALLOWED_CLUB_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

function hasValidProfileClubNameSyntax(value: string) {
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
  if (!hasValidProfileClubNameSyntax(trimmed)) {
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

/** Single source of truth for club names accepted by onboarding and public visibility. */
export function isValidProfileClubName(value: string) {
  return getProfileClubNameValidationError(value) === null;
}
