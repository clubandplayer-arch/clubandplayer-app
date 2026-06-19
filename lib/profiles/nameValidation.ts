const DISALLOWED_PERSON_NAME_CHARS = /[^\p{L}\p{M}\s.'’-]/gu;
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}\s.'’-]+$/u;

export function sanitizeProfilePersonName(value: string) {
  return value.replace(DISALLOWED_PERSON_NAME_CHARS, '').replace(/\s{2,}/g, ' ');
}

export function isValidProfilePersonName(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && PERSON_NAME_PATTERN.test(trimmed);
}
