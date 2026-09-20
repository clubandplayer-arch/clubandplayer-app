import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CanonicalSearchArea,
  CanonicalSearchCountry,
  SearchGeographyCatalog,
} from './canonicalGeographyContract';

type CountryRow = {
  id: string;
  iso2: string;
  official_name: string;
  is_active: boolean;
  is_supported: boolean;
};

type AreaRow = {
  id: string;
  country_id: string;
  official_name: string;
  area_type: string;
  is_active: boolean;
};

/** Read-only catalogue adapter used by Search canonical filters. */
export class SupabaseSearchGeographyCatalog implements SearchGeographyCatalog {
  constructor(private readonly client: SupabaseClient) {}

  async getCountry(countryId: string): Promise<CanonicalSearchCountry | null> {
    const { data, error } = await this.client
      .from('countries')
      .select('id,iso2,official_name,is_active,is_supported')
      .eq('id', countryId)
      .maybeSingle();
    if (error) throw error;
    const row = data as CountryRow | null;
    return row
      ? {
          id: row.id,
          iso2: row.iso2,
          officialName: row.official_name,
          isActive: row.is_active,
          isSupported: row.is_supported,
        }
      : null;
  }

  async getArea(geoAreaId: string): Promise<CanonicalSearchArea | null> {
    const { data, error } = await this.client
      .from('geo_areas')
      .select('id,country_id,official_name,area_type,is_active')
      .eq('id', geoAreaId)
      .maybeSingle();
    if (error) throw error;
    const row = data as AreaRow | null;
    return row
      ? {
          id: row.id,
          countryId: row.country_id,
          officialName: row.official_name,
          areaType: row.area_type,
          isActive: row.is_active,
        }
      : null;
  }

  async getActiveDescendantIds(geoAreaId: string, countryId: string): Promise<string[]> {
    const descendants: string[] = [];
    const seen = new Set<string>([geoAreaId]);
    let parents = [geoAreaId];
    for (let depth = 0; parents.length && depth < 16; depth += 1) {
      // A large region can contain thousands of municipalities. Chunk parent
      // IDs so PostgREST URLs stay bounded instead of failing with HTTP 500.
      const rows: Array<{ id: string }> = [];
      for (let offset = 0; offset < parents.length; offset += 100) {
        const { data, error } = await this.client
          .from('geo_areas')
          .select('id')
          .eq('country_id', countryId)
          .eq('is_active', true)
          .in('parent_id', parents.slice(offset, offset + 100));
        if (error) throw error;
        rows.push(...((data ?? []) as Array<{ id: string }>));
      }
      const children = rows.flatMap((row) => {
        const id = typeof row.id === 'string' ? row.id : null;
        if (!id || seen.has(id)) return [];
        seen.add(id);
        descendants.push(id);
        return [id];
      });
      parents = children;
    }
    if (parents.length) throw new Error('canonical geography hierarchy is too deep');
    return descendants;
  }
}
