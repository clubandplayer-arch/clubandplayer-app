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

export function resolveLegacySportValue(
  mappings: LegacySportMapping[],
  sportId: string,
  disciplineId: string,
  variantId: string,
  fallback: string,
) {
  const exact = mappings.find((item) => item.sportId === sportId
    && (item.disciplineId ?? '') === disciplineId
    && (item.variantId ?? '') === variantId);
  if (exact) return exact.legacyValue;
  const discipline = mappings.find((item) => item.sportId === sportId
    && (item.disciplineId ?? '') === disciplineId
    && !item.variantId);
  if (discipline) return discipline.legacyValue;
  const sport = mappings.find((item) => item.sportId === sportId
    && !item.disciplineId && !item.variantId);
  return sport?.legacyValue ?? fallback;
}
