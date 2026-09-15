import type { SupabaseClient } from '@supabase/supabase-js';

type CountryRow = { iso2?: string | null; official_name?: string | null };
type AreaRow = {
  official_name?: string | null;
  country?: CountryRow | CountryRow[] | null;
};
type InterestRow = {
  profile_id?: string | null;
  priority?: number | null;
  area?: AreaRow | AreaRow[] | null;
};

const relation = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

/**
 * Returns the first public scouting area selected by each profile. Search cards
 * for people use this value before the legacy residence fields, matching the
 * "area of interest" shown on their own profile card.
 */
export async function loadProfileSearchInterestLocations(
  client: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  if (!ids.length) return new Map();

  const { data, error } = await client
    .from('profile_geo_area_interests')
    .select('profile_id,priority,area:geo_areas(official_name,country:countries(iso2,official_name))')
    .in('profile_id', ids)
    .order('priority', { ascending: true });

  // Geographic interests are optional and the search endpoint must keep
  // working during partial deployments where the canonical tables are absent.
  if (error || !Array.isArray(data)) return new Map();

  const locations = new Map<string, string>();
  for (const raw of data as InterestRow[]) {
    const profileId = raw.profile_id ? String(raw.profile_id) : '';
    if (!profileId || locations.has(profileId)) continue;
    const area = relation(raw.area);
    const country = relation(area?.country);
    const label = [area?.official_name, country?.official_name || country?.iso2]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' · ');
    if (label) locations.set(profileId, label);
  }
  return locations;
}
