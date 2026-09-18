import { getProfileClubNameValidationError } from '@/lib/profiles/nameValidation';
import { hasClubOrganizationWord, hasRecognizedClubNameAcronym } from '@/lib/clubs/clubNameSignals';

export function getClubNameReviewReason(value: unknown, countryIso2?: unknown): string | null {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'Nome Club mancante';

  const validationError = getProfileClubNameValidationError(name);
  if (validationError) return validationError;

  const hasOrganizationSignal = hasRecognizedClubNameAcronym(name, countryIso2)
    || hasClubOrganizationWord(name)
    || /\d/u.test(name);
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

export function shouldIncludeClubInQualityList(reasonCount: number, reviewStatus: unknown): boolean {
  return reasonCount > 0 || reviewStatus === 'approved' || reviewStatus === 'rejected';
}

export function isMissingClubQualitySchemaError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = typeof candidate?.message === 'string' ? candidate.message : '';
  const mentionsQualityColumn = /(?:profiles\.)?(?:registry_master_id|club_name_review_(?:status|reason)|club_name_reviewed_(?:at|by))/iu.test(message);
  return (
    (code === '42703' && mentionsQualityColumn) ||
    (code === 'PGRST204' && mentionsQualityColumn)
  );
}
