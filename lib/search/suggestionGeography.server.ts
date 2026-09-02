import type { SupabaseClient } from '@supabase/supabase-js';

import { getCountryName } from '@/lib/geo/countries';
import {
  buildSuggestionGeographyPlan,
  type SuggestionCanonicalArea,
  type SuggestionCanonicalCountry,
  type SuggestionGeoFilter,
  type SuggestionGeographyPlan,
} from './suggestionGeography';

type CountryRow = { iso2: string; official_name: string };
type AreaRow = { official_name: string; area_type: string; country?: CountryRow | CountryRow[] | null };
const relation = <T>(value: T | T[] | null | undefined) => Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

function toCountry(row?: CountryRow | null): SuggestionCanonicalCountry | null {
  if (!row?.iso2 || !row.official_name) return null;
  return { iso2: row.iso2, officialName: row.official_name, localizedName: getCountryName(row.iso2) ?? null };
}

function toArea(row?: AreaRow | null): SuggestionCanonicalArea | null {
  const country = toCountry(relation(row?.country));
  if (!row?.official_name || !row.area_type || !country) return null;
  return { officialName: row.official_name, areaType: row.area_type, country };
}

/** Loads only the authenticated viewer's private preferences through owner RLS. */
export async function loadViewerSuggestionGeography(
  client: SupabaseClient,
  profile: {
    id: string;
    country?: string | null;
    region?: string | null;
    province?: string | null;
    city?: string | null;
    interest_country?: string | null;
    interest_region?: string | null;
    interest_province?: string | null;
    interest_city?: string | null;
  },
): Promise<SuggestionGeographyPlan> {
  const [preferencesResult, countryInterestsResult, areaInterestsResult] = await Promise.all([
    client
      .from('profile_preferences')
      .select('residence_country_id,residence_geo_area_id,open_to_relocation')
      .eq('profile_id', profile.id)
      .maybeSingle(),
    client
      .from('profile_country_interests')
      .select('priority,country:countries!inner(iso2,official_name)')
      .eq('profile_id', profile.id)
      .order('priority', { ascending: true, nullsFirst: false }),
    client
      .from('profile_geo_area_interests')
      .select('priority,area:geo_areas!inner(official_name,area_type,country:countries!inner(iso2,official_name))')
      .eq('profile_id', profile.id)
      .order('priority', { ascending: true, nullsFirst: false }),
  ]);
  for (const result of [preferencesResult, countryInterestsResult, areaInterestsResult]) {
    if (result.error) throw result.error;
  }

  const preferences = preferencesResult.data as {
    residence_country_id?: string | null;
    residence_geo_area_id?: string | null;
    open_to_relocation?: boolean | null;
  } | null;
  const [residenceCountryResult, residenceAreaResult] = await Promise.all([
    preferences?.residence_country_id
      ? client.from('countries').select('iso2,official_name').eq('id', preferences.residence_country_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    preferences?.residence_geo_area_id
      ? client.from('geo_areas').select('official_name,area_type,country:countries!inner(iso2,official_name)').eq('id', preferences.residence_geo_area_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (residenceCountryResult.error) throw residenceCountryResult.error;
  if (residenceAreaResult.error) throw residenceAreaResult.error;

  const countryInterests = (countryInterestsResult.data ?? []).flatMap((row: any) => {
    const country = toCountry(relation(row.country));
    return country ? [{ country, priority: typeof row.priority === 'number' ? row.priority : null }] : [];
  });
  const areaInterests = (areaInterestsResult.data ?? []).flatMap((row: any) => {
    const area = toArea(relation(row.area));
    return area ? [{ area, priority: typeof row.priority === 'number' ? row.priority : null }] : [];
  });

  return buildSuggestionGeographyPlan({
    countryInterests,
    areaInterests,
    residenceCountry: toCountry(residenceCountryResult.data as CountryRow | null),
    residenceArea: toArea(residenceAreaResult.data as AreaRow | null),
    openToRelocation: preferences?.open_to_relocation === true,
    legacyInterest: {
      country: profile.interest_country,
      region: profile.interest_region,
      province: profile.interest_province,
      city: profile.interest_city,
    },
    legacyResidence: {
      country: profile.country,
      region: profile.region,
      province: profile.province,
      city: profile.city,
    },
  });
}

const escapeLike = (value: string) => value.replace(/[%_]/g, (token) => `\\${token}`);

/** Applies a trusted viewer-derived filter only to target public location. */
export function applySuggestionGeographyFilter<T>(query: T, filter: SuggestionGeoFilter): T {
  const nextQuery: any = query;
  if (filter.values.length === 1) return nextQuery.ilike(filter.field, escapeLike(filter.values[0])) as T;
  return nextQuery.or(filter.values.map((value) => `${filter.field}.ilike.${escapeLike(value)}`).join(',')) as T;
}
