import type { SupabaseClient } from '@supabase/supabase-js';

export type CanonicalCountryRead = {
  id: string;
  iso2: string;
  iso3: string | null;
  officialName: string;
  isSupported: boolean;
  isActive: boolean;
  displayOrder: number;
};

type CountryRow = {
  id: string;
  iso2: string;
  iso3: string | null;
  official_name: string;
  is_supported: boolean;
  is_active: boolean;
  display_order: number;
};

export async function getSupportedCountries(client: SupabaseClient): Promise<CanonicalCountryRead[]> {
  const { data, error } = await client
    .from('countries')
    .select('id,iso2,iso3,official_name,is_supported,is_active,display_order')
    .eq('is_supported', true)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('official_name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CountryRow[]).map((row) => ({
    id: row.id,
    iso2: row.iso2,
    iso3: row.iso3,
    officialName: row.official_name,
    isSupported: row.is_supported,
    isActive: row.is_active,
    displayOrder: row.display_order,
  }));
}
