import { getProfileClubNameValidationError } from '@/lib/profiles/nameValidation';

const ORGANIZATION_KEYWORDS = /(?:^|\s)(?:academy|accademia|ac|asd|associazione|atletico|athletic|basket|calcio|club|fc|polisportiva|real|rugby|sc|societ[aà]|sport|sporting|ssd|ss|team|tennis|uc|unione|united|us|volley)(?:\s|[.,]|$)/iu;

export function getClubNameReviewReason(value: unknown): string | null {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'Nome Club mancante';

  const validationError = getProfileClubNameValidationError(name);
  if (validationError) return validationError;

  const hasOrganizationSignal = ORGANIZATION_KEYWORDS.test(name) || /\d|[.,]/u.test(name);
  if (!hasOrganizationSignal) {
    return 'Denominazione priva di un riferimento societario riconoscibile';
  }

  return null;
}

export function normalizeClubNameForDuplicateCheck(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('it-IT')
    .replace(/\./gu, '')
    .replace(/\b(?:asd|ssd|ac|fc)\b/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}
