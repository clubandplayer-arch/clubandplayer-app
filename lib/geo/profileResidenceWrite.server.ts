import type { SupabaseClient } from '@supabase/supabase-js';

import type { ResidencePatch } from './profileResidenceWriteContract';

export type ProfileResidenceWriteResult = {
  profileId: string;
  source: 'canonical' | 'none';
  residenceCountryId: string | null;
  residenceGeoAreaId: string | null;
  legacyResidence: {
    region: string | null;
    province: string | null;
    city: string | null;
    regionId: number | null;
    provinceId: number | null;
    municipalityId: number | null;
  };
};

export type ProfileResidenceWriteExecution =
  | { status: 'skipped'; data: null }
  | { status: 'written'; data: ProfileResidenceWriteResult };

/**
 * Server-only RPC adapter. An absent patch is deliberately not sent to the DB;
 * the RPC derives the profile from auth.uid() and accepts no profile identifier.
 */
export async function writeMyProfileResidence(
  client: SupabaseClient,
  patch: ResidencePatch,
): Promise<ProfileResidenceWriteExecution> {
  if (patch.kind === 'absent') return { status: 'skipped', data: null };

  const { data, error } = await client.rpc('update_my_profile_residence', {
    p_residence_country_id: patch.residenceCountryId,
    p_residence_geo_area_id: patch.residenceGeoAreaId,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('profile residence RPC returned an invalid result');
  }
  return { status: 'written', data: data as ProfileResidenceWriteResult };
}
