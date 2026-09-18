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
export function sanitizeProfileClubName(value: string) {
  return value.replace(DISALLOWED_CLUB_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

function hasValidProfileClubNameSyntax(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && CLUB_NAME_PATTERN.test(trimmed);
}

export function getProfileClubNameValidationError(value: string) {
  const trimmed = value.trim();
  if (!hasValidProfileClubNameSyntax(trimmed)) {
    return 'Il campo Nome del club può contenere solo lettere, numeri, spazi, apostrofo, virgola, punto e trattino';
  }

  return null;
}

/** Name validity is syntax-only: organization signals never gate completion or publication. */
export function isValidProfileClubName(value: string) {
  return getProfileClubNameValidationError(value) === null;
}
