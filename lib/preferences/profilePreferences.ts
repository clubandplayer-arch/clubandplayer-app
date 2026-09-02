import type { CanonicalCountry } from '@/lib/taxonomy/catalog';
import { resolveCountryTaxonomy } from '@/lib/taxonomy/legacyMappings';

export type ProfilePreferenceSnapshot = {
  preferredLanguageCode?: string | null;
  residenceCountryCode?: string | null;
  openToRelocation?: boolean | null;
};

export type LegacyProfileCountrySnapshot = {
  country?: string | null;
  birthCountry?: string | null;
  interestCountry?: string | null;
};

export type ResidenceCountryResolution = {
  source: 'canonical' | 'legacy' | 'none';
  country: CanonicalCountry | null;
  legacyValue: string | null;
};

export type CountryInterestResolution = {
  source: 'canonical' | 'legacy' | 'none';
  countries: CanonicalCountry[];
  unrecognizedLegacyValue: string | null;
};

/** Canonical residence wins; birth country is intentionally not an input. */
export function resolveResidenceCountry(input: {
  preferences?: ProfilePreferenceSnapshot | null;
  legacyProfile?: LegacyProfileCountrySnapshot | null;
}): ResidenceCountryResolution {
  const canonicalCode = input.preferences?.residenceCountryCode?.trim() || null;
  if (canonicalCode) {
    const canonical = resolveCountryTaxonomy(canonicalCode).country;
    if (canonical) return { source: 'canonical', country: canonical, legacyValue: input.legacyProfile?.country ?? null };
  }

  const legacyValue = input.legacyProfile?.country?.trim() || null;
  const legacy = resolveCountryTaxonomy(legacyValue);
  return legacy.country
    ? { source: 'legacy', country: legacy.country, legacyValue }
    : { source: 'none', country: null, legacyValue };
}

/**
 * Multiple canonical interests win. The legacy single-country field is only a
 * fallback when no canonical relation exists, and its unknown value is kept.
 */
export function resolveCountriesOfInterest(input: {
  canonicalCountryCodes?: readonly string[] | null;
  legacyInterestCountry?: string | null;
}): CountryInterestResolution {
  const canonicalCountries = Array.from(
    new Map(
      (input.canonicalCountryCodes ?? [])
        .map((code) => resolveCountryTaxonomy(code).country)
        .filter((country): country is CanonicalCountry => country != null)
        .map((country) => [country.iso2, country]),
    ).values(),
  );

  if (canonicalCountries.length > 0) {
    return { source: 'canonical', countries: canonicalCountries, unrecognizedLegacyValue: null };
  }

  const legacyValue = input.legacyInterestCountry?.trim() || null;
  const legacyCountry = resolveCountryTaxonomy(legacyValue).country;
  if (legacyCountry) {
    return { source: 'legacy', countries: [legacyCountry], unrecognizedLegacyValue: null };
  }

  return { source: 'none', countries: [], unrecognizedLegacyValue: legacyValue };
}

export function resolveOpenToRelocation(preferences?: ProfilePreferenceSnapshot | null): boolean {
  return preferences?.openToRelocation === true;
}
