import type { SupabaseClient } from '@supabase/supabase-js';

import type { ResidencePatch } from './profileResidenceWriteContract';

/**
 * The club geography RPC owns the complete transaction (canonical preferences,
 * legacy projection and country-change reconciliation).  Deliberately do not
 * add a table-write fallback here: partial writes would lose that guarantee.
 */
export async function writeMyClubGeography(client: SupabaseClient, patch: ResidencePatch) {
  if (patch.kind === 'absent') return { status: 'skipped' as const, data: null };

  const { data, error } = await client.rpc('update_my_club_geography', {
    p_residence_country_id: patch.residenceCountryId,
    p_residence_geo_area_id: patch.residenceGeoAreaId,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('club geography RPC returned an invalid result');
  }

  return { status: 'written' as const, data };
}
