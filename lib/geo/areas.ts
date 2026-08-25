import type { SupabaseClient } from '@supabase/supabase-js';

export type GeoAreaRead = {
  id: string;
  country_id: string;
  parent_id: string | null;
  code: string | null;
  code_authority: string | null;
  official_name: string;
  short_name: string | null;
  area_type: string;
  level: number;
  is_active: boolean;
  display_order: number;
  centroid_lat: number | null;
  centroid_lng: number | null;
  min_lat: number | null;
  min_lng: number | null;
  max_lat: number | null;
  max_lng: number | null;
  country?: { iso2: string } | null;
  geo_area_names?: Array<{ locale: string; name: string; is_preferred: boolean }>;
};

export type GeoAreaFilters = {
  countryIso2?: string;
  parentId?: string | null;
  level?: number;
  active?: boolean;
};

export type GeoReadErrorCode =
  | 'INVALID_COUNTRY'
  | 'INVALID_UUID'
  | 'AREA_NOT_FOUND'
  | 'COUNTRY_PARENT_MISMATCH'
  | 'HIERARCHY_CYCLE'
  | 'HIERARCHY_TOO_DEEP';

export class GeoReadError extends Error {
  constructor(public readonly code: GeoReadErrorCode, message: string) {
    super(message);
    this.name = 'GeoReadError';
  }
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCountryIso2(value: string): string {
  const iso2 = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) throw new GeoReadError('INVALID_COUNTRY', 'country must be an ISO2 code');
  return iso2;
}

export function assertUuid(value: string, name = 'id'): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) throw new GeoReadError('INVALID_UUID', `${name} must be a UUID`);
  return normalized;
}

const GEO_AREA_SELECT = [
  'id', 'country_id', 'parent_id', 'code', 'code_authority', 'official_name', 'short_name',
  'area_type', 'level', 'is_active', 'display_order', 'centroid_lat', 'centroid_lng',
  'min_lat', 'min_lng', 'max_lat', 'max_lng', 'country:countries!inner(iso2)',
  'geo_area_names(locale,name,is_preferred)',
].join(',');

export async function getGeoAreas(client: SupabaseClient, filters: GeoAreaFilters = {}): Promise<GeoAreaRead[]> {
  let query = client
    .from('geo_areas')
    .select(GEO_AREA_SELECT)
    .order('display_order', { ascending: true })
    .order('official_name', { ascending: true });

  if (filters.countryIso2) query = query.eq('countries.iso2', normalizeCountryIso2(filters.countryIso2));
  if (filters.parentId === null) query = query.is('parent_id', null);
  else if (filters.parentId) query = query.eq('parent_id', filters.parentId);
  if (filters.level != null) query = query.eq('level', filters.level);
  if (filters.active != null) query = query.eq('is_active', filters.active);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as GeoAreaRead[];
}

export function getGeoAreaChildren(
  client: SupabaseClient,
  parentId: string,
  filters: Omit<GeoAreaFilters, 'parentId'> = {},
): Promise<GeoAreaRead[]> {
  return getGeoAreas(client, { ...filters, parentId });
}

export async function getGeoAreaById(client: SupabaseClient, id: string): Promise<GeoAreaRead | null> {
  const { data, error } = await client.from('geo_areas').select(GEO_AREA_SELECT).eq('id', assertUuid(id)).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as GeoAreaRead | null;
}

export function getRootGeoAreas(client: SupabaseClient, countryIso2: string): Promise<GeoAreaRead[]> {
  return getGeoAreas(client, { countryIso2: normalizeCountryIso2(countryIso2), parentId: null, active: true });
}

export async function getCountryGeoAreaChildren(
  client: SupabaseClient,
  countryIso2: string,
  parentId: string,
): Promise<GeoAreaRead[]> {
  const iso2 = normalizeCountryIso2(countryIso2);
  const parent = await getGeoAreaById(client, assertUuid(parentId, 'parentId'));
  if (!parent) throw new GeoReadError('AREA_NOT_FOUND', 'parent geo area was not found');
  const parentCountry = Array.isArray(parent.country) ? parent.country[0]?.iso2 : parent.country?.iso2;
  if (parentCountry !== iso2) {
    throw new GeoReadError('COUNTRY_PARENT_MISMATCH', 'parent geo area does not belong to country');
  }
  return getGeoAreas(client, { countryIso2: iso2, parentId: parent.id, active: true });
}

/** Returns root-to-parent order and supports variable-depth hierarchies. */
export async function getGeoAreaAncestors(
  client: SupabaseClient,
  areaId: string,
  maxDepth = 16,
): Promise<GeoAreaRead[]> {
  let current = await getGeoAreaById(client, assertUuid(areaId, 'areaId'));
  if (!current) throw new GeoReadError('AREA_NOT_FOUND', 'geo area was not found');

  const seen = new Set<string>([current.id]);
  const ancestors: GeoAreaRead[] = [];
  while (current.parent_id) {
    if (ancestors.length >= maxDepth) throw new GeoReadError('HIERARCHY_TOO_DEEP', 'geo area hierarchy exceeds maximum depth');
    if (seen.has(current.parent_id)) throw new GeoReadError('HIERARCHY_CYCLE', 'geo area hierarchy contains a cycle');
    seen.add(current.parent_id);
    const parent = await getGeoAreaById(client, current.parent_id);
    if (!parent) throw new GeoReadError('AREA_NOT_FOUND', 'ancestor geo area was not found');
    if (parent.country_id !== current.country_id) {
      throw new GeoReadError('COUNTRY_PARENT_MISMATCH', 'ancestor geo area belongs to another country');
    }
    ancestors.push(parent);
    current = parent;
  }
  return ancestors.reverse();
}
