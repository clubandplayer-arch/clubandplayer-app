import type { CanonicalSportFormValue } from './canonicalSportFormPayload';

export type LegacySportMapping = {
  legacyValue: string;
  sportId: string;
  disciplineId: string | null;
  variantId: string | null;
};

export function hydrateCanonicalSportValue(
  mappings: LegacySportMapping[],
  value: CanonicalSportFormValue,
): CanonicalSportFormValue | null {
  const mapped = mappings.find((item) => item.legacyValue === value.legacySport)
    ?? mappings.find((item) => item.sportId === value.sportId
      && (item.disciplineId ?? '') === value.disciplineId
      && (item.variantId ?? '') === value.variantId)
    ?? mappings.find((item) => item.sportId === value.sportId);
  if (!mapped) return null;
  return {
    sportId: mapped.sportId,
    disciplineId: mapped.disciplineId ?? '',
    variantId: mapped.variantId ?? '',
    legacySport: mapped.legacyValue,
  };
}
