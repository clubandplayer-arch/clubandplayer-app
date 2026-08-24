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

  if (filters.countryIso2) query = query.eq('countries.iso2', filters.countryIso2.toUpperCase());
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
  const { data, error } = await client.from('geo_areas').select(GEO_AREA_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as GeoAreaRead | null;
}
