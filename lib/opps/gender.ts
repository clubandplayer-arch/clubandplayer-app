// lib/opps/gender.ts

export type OpportunityGenderCode = 'male' | 'female' | 'mixed';

const CANONICAL_DB_VALUES: Record<OpportunityGenderCode, string> = {
  male: 'Maschile',
  female: 'Femminile',
  mixed: 'Misto',
};

const FALLBACK_DB_VALUES: Record<OpportunityGenderCode, string> = {
  male: 'male',
  female: 'female',
  mixed: 'mixed',
};

const NORMALIZED_VARIANTS: Record<OpportunityGenderCode, string[]> = {
  male: ['male', 'maschile', 'm', 'uomo', 'uomini'],
  female: ['female', 'femminile', 'f', 'donna', 'donne'],
  mixed: ['mixed', 'misto', 'coed', 'co-ed', 'entrambi', 'both'],
};

const LABELS: Record<OpportunityGenderCode, string> = {
  male: 'Maschile',
  female: 'Femminile',
  mixed: 'Misto',
};

export function normalizeOpportunityGender(
  value: unknown
): OpportunityGenderCode | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  for (const [code, variants] of Object.entries(NORMALIZED_VARIANTS)) {
    if (variants.includes(raw)) {
      return code as OpportunityGenderCode;
    }
  }
  return null;
}

export function toOpportunityDbValue(
  code: OpportunityGenderCode,
  strategy: 'canonical' | 'fallback' = 'canonical'
): string {
  return strategy === 'canonical'
    ? CANONICAL_DB_VALUES[code]
    : FALLBACK_DB_VALUES[code];
}

export function opportunityGenderLabel(value: unknown): string | null {
  const normalized = normalizeOpportunityGender(value);
  return normalized ? LABELS[normalized] : null;
}

export const OPPORTUNITY_GENDER_LABELS = LABELS;
