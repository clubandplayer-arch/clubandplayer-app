import { canonicalAreaLegacyField } from './canonicalGeographyContract';
import {
  compareSearchGeographyRank,
  rankSearchGeography,
  type SearchGeographyRankingSignals,
} from './canonicalGeographyContract';

export type SuggestionGeoField = 'country' | 'region' | 'province' | 'city';
export type SuggestionGeoSource =
  | 'canonical_area_interest'
  | 'canonical_country_interest'
  | 'legacy_interest'
  | 'canonical_residence'
  | 'legacy_residence';

export type SuggestionGeoFilter = {
  field: SuggestionGeoField;
  values: string[];
  source: SuggestionGeoSource;
  priority: number | null;
};

export type SuggestionCanonicalCountry = {
  iso2: string;
  officialName: string;
  localizedName: string | null;
};

export type SuggestionCanonicalArea = {
  officialName: string;
  areaType: string;
  country: SuggestionCanonicalCountry;
};

export type SuggestionGeographyPlanInput = {
  countryInterests: Array<{ country: SuggestionCanonicalCountry; priority: number | null }>;
  areaInterests: Array<{ area: SuggestionCanonicalArea; priority: number | null }>;
  residenceCountry: SuggestionCanonicalCountry | null;
  residenceArea: SuggestionCanonicalArea | null;
  openToRelocation: boolean;
  legacyInterest: Partial<Record<SuggestionGeoField, string | null>>;
  legacyResidence: Partial<Record<SuggestionGeoField, string | null>>;
};

export type SuggestionGeographyPlan = {
  filters: SuggestionGeoFilter[];
  hasCanonicalInterests: boolean;
  openToRelocation: boolean;
};

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function countryValues(country: SuggestionCanonicalCountry) {
  return Array.from(new Set([
    clean(country.iso2),
    clean(country.officialName),
    clean(country.localizedName),
  ].filter((value): value is string => Boolean(value))));
}

function addFilter(target: SuggestionGeoFilter[], seen: Set<string>, filter: SuggestionGeoFilter) {
  const values = Array.from(new Set(filter.values.map(clean).filter((value): value is string => Boolean(value))));
  if (!values.length) return;
  const key = `${filter.field}:${values.map((value) => value.toLocaleLowerCase('en')).sort().join('|')}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ ...filter, values });
}

function addLegacyFilters(
  target: SuggestionGeoFilter[],
  seen: Set<string>,
  source: Extract<SuggestionGeoSource, 'legacy_interest' | 'legacy_residence'>,
  values: SuggestionGeographyPlanInput['legacyInterest'],
) {
  for (const field of ['city', 'province', 'region', 'country'] as const) {
    const value = clean(values[field]);
    if (value) addFilter(target, seen, { field, values: [value], source, priority: null });
  }
}

/**
 * Canonical viewer interests win, then legacy interests, canonical residence,
 * and legacy residence. Target interests are deliberately never an input.
 */
export function buildSuggestionGeographyPlan(input: SuggestionGeographyPlanInput): SuggestionGeographyPlan {
  const filters: SuggestionGeoFilter[] = [];
  const seen = new Set<string>();
  const byPriority = <T extends { priority: number | null }>(a: T, b: T) =>
    (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER);

  for (const item of [...input.areaInterests].sort(byPriority)) {
    addFilter(filters, seen, {
      field: canonicalAreaLegacyField(item.area.areaType),
      values: [item.area.officialName],
      source: 'canonical_area_interest',
      priority: item.priority,
    });
    addFilter(filters, seen, {
      field: 'country',
      values: countryValues(item.area.country),
      source: 'canonical_area_interest',
      priority: item.priority,
    });
  }
  for (const item of [...input.countryInterests].sort(byPriority)) {
    addFilter(filters, seen, {
      field: 'country',
      values: countryValues(item.country),
      source: 'canonical_country_interest',
      priority: item.priority,
    });
  }

  addLegacyFilters(filters, seen, 'legacy_interest', input.legacyInterest);

  if (input.residenceArea) {
    addFilter(filters, seen, {
      field: canonicalAreaLegacyField(input.residenceArea.areaType),
      values: [input.residenceArea.officialName],
      source: 'canonical_residence',
      priority: null,
    });
  }
  if (input.residenceCountry) {
    addFilter(filters, seen, {
      field: 'country',
      values: countryValues(input.residenceCountry),
      source: 'canonical_residence',
      priority: null,
    });
  }
  addLegacyFilters(filters, seen, 'legacy_residence', input.legacyResidence);

  return {
    filters,
    hasCanonicalInterests: input.areaInterests.length > 0 || input.countryInterests.length > 0,
    openToRelocation: input.openToRelocation,
  };
}

export function suggestionFiltersForScope(plan: SuggestionGeographyPlan, scope: SuggestionGeoField) {
  return plan.filters.filter((filter) => filter.field === scope);
}

export type SuggestionRankableCandidate = {
  id: string;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  sport?: string | null;
  updated_at?: string | null;
};

const normalized = (value?: string | null) => value?.trim().toLocaleLowerCase('en') ?? '';

function filterMatchesCandidate(filter: SuggestionGeoFilter, candidate: SuggestionRankableCandidate) {
  const candidateValue = normalized(candidate[filter.field]);
  return Boolean(candidateValue) && filter.values.some((value) => normalized(value) === candidateValue);
}

/**
 * D5 ranking boundary. It ranks an already-visible candidate pool and never
 * changes eligibility. Relocation is compatible only for an explicit interest
 * outside a known residence country; it is never inferred from missing data.
 */
export function rankSuggestionCandidates<T extends SuggestionRankableCandidate>(
  candidates: T[],
  plan: SuggestionGeographyPlan,
  viewerSport?: string | null,
): T[] {
  const residenceCountryFilters = plan.filters.filter((filter) =>
    filter.field === 'country' && (filter.source === 'canonical_residence' || filter.source === 'legacy_residence'));

  return candidates
    .map((candidate) => {
      const matched = plan.filters.filter((filter) => filterMatchesCandidate(filter, candidate));
      const canonicalArea = matched.some((filter) => filter.field !== 'country'
        && (filter.source === 'canonical_area_interest' || filter.source === 'canonical_residence'));
      const canonicalCountry = matched.some((filter) => filter.field === 'country'
        && (filter.source === 'canonical_area_interest'
          || filter.source === 'canonical_country_interest'
          || filter.source === 'canonical_residence'));
      const legacyArea = matched.some((filter) => filter.field !== 'country'
        && (filter.source === 'legacy_interest' || filter.source === 'legacy_residence'));
      const legacyCountry = matched.some((filter) => filter.field === 'country'
        && (filter.source === 'legacy_interest' || filter.source === 'legacy_residence'));
      const matchesInterest = matched.some((filter) => filter.source.endsWith('_interest'));
      const hasResidenceCountry = residenceCountryFilters.length > 0;
      const matchesResidenceCountry = residenceCountryFilters.some((filter) => filterMatchesCandidate(filter, candidate));
      const signals: SearchGeographyRankingSignals = {
        canonicalAreaMatch: canonicalArea,
        canonicalCountryMatch: canonicalCountry,
        legacyAreaMatch: legacyArea,
        legacyCountryMatch: legacyCountry,
        sportMatch: Boolean(normalized(viewerSport)) && normalized(viewerSport) === normalized(candidate.sport),
        relocationCompatible: plan.openToRelocation && matchesInterest && hasResidenceCountry
          && Boolean(normalized(candidate.country)) && !matchesResidenceCountry,
      };
      const rank = rankSearchGeography(signals);
      const priority = matched
        .filter((filter) => filter.source.endsWith('_interest') && filter.priority !== null)
        .reduce<number | null>((best, filter) => best === null ? filter.priority : Math.min(best, filter.priority!), null);
      return { candidate, ...rank, interestPriority: priority, updatedAt: candidate.updated_at ?? null };
    })
    .sort((a, b) => compareSearchGeographyRank(
      { id: a.candidate.id, score: a.score, reasons: a.reasons, interestPriority: a.interestPriority, updatedAt: a.updatedAt },
      { id: b.candidate.id, score: b.score, reasons: b.reasons, interestPriority: b.interestPriority, updatedAt: b.updatedAt },
    ))
    .map(({ candidate }) => candidate);
}
