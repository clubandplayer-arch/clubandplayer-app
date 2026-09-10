export type CanonicalSportFormValue = {
  sportId: string;
  disciplineId: string;
  variantId: string;
  legacySport: string;
};

export type CanonicalSportRequestFields =
  | { sport: string | null }
  | {
      primarySport: {
        canonical: {
          sportId: string;
          disciplineId: string | null;
          variantId: string | null;
        };
      };
    };

/** The API contract accepts either top-level legacy `sport` or `primarySport`, never both. */
export function buildCanonicalSportRequestFields(value: CanonicalSportFormValue): CanonicalSportRequestFields {
  if (!value.sportId) return { sport: value.legacySport.trim() || null };
  return {
    primarySport: {
      canonical: {
        sportId: value.sportId,
        disciplineId: value.disciplineId || null,
        variantId: value.variantId || null,
      },
    },
  };
}

export function buildExperienceFormPayload<T extends { sport: string; primarySport?: {
  sportId: string | null;
  disciplineId: string | null;
  variantId: string | null;
} | null }>(experience: T) {
  const { primarySport, sport, ...fields } = experience;
  return {
    ...fields,
    ...buildCanonicalSportRequestFields({
      sportId: primarySport?.sportId ?? '',
      disciplineId: primarySport?.disciplineId ?? '',
      variantId: primarySport?.variantId ?? '',
      legacySport: sport,
    }),
  };
}
