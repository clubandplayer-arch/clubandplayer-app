import { NextResponse, type NextRequest } from 'next/server';

import { withAuth, jsonError } from '@/lib/api/auth';
import {
  isCanonicalProfileResidenceUiEnabled,
  isCanonicalProfileResidenceWriteEnabled,
  isCanonicalProfileResidenceWriteUserAllowed,
} from '@/lib/env/features';
import { getProfileGeography } from '@/lib/geo/profileGeography';
import { SupabaseProfileGeographyRepository } from '@/lib/geo/profileGeography.server';
import { writeMyProfileResidence } from '@/lib/geo/profileResidenceWrite.server';
import { parseResidencePatch, ResidenceContractError } from '@/lib/geo/profileResidenceWriteContract';

export const runtime = 'nodejs';

const eligible = (accountType: string | null | undefined) =>
  accountType === 'athlete' || accountType === 'staff' || accountType === 'club';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,account_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!profile) return jsonError('Profile not found', 404);
  if (!eligible(profile.account_type)) return jsonError('Canonical residence is limited to Player, Staff and Club', 403);
  if (profile.account_type !== 'club' && !isCanonicalProfileResidenceUiEnabled()) {
    return NextResponse.json({ enabled: false, writable: false, residence: null });
  }

  try {
    const geography = await getProfileGeography(new SupabaseProfileGeographyRepository(supabase), profile.id);
    return NextResponse.json({
      enabled: true,
      writable: profile.account_type === 'club' || (
        isCanonicalProfileResidenceWriteEnabled()
        && isCanonicalProfileResidenceWriteUserAllowed(user.id)
      ),
      residence: {
        source: geography.residence.source,
        residenceCountryId: geography.residence.countryId,
        residenceGeoAreaId: geography.residence.areaId,
      },
    });
  } catch (reason) {
    return jsonError(reason instanceof Error ? reason.message : 'Unable to read canonical residence', 400);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!profile) return jsonError('Profile not found', 404);
  if (!eligible(profile.account_type)) return jsonError('Canonical residence is limited to Player, Staff and Club', 403);

  // Club geography is the authoritative registration country and is always
  // writable; the existing Player/Staff rollout gates remain unchanged.
  if (profile.account_type !== 'club' && !isCanonicalProfileResidenceWriteEnabled()) {
    return jsonError('Canonical residence writes are disabled pending Supabase certification', 503);
  }
  if (profile.account_type !== 'club' && !isCanonicalProfileResidenceWriteUserAllowed(user.id)) {
    return jsonError('Canonical residence writes are not enabled for this account', 403);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let patch;
  try {
    patch = parseResidencePatch(body);
  } catch (reason) {
    if (reason instanceof ResidenceContractError) return jsonError(reason.message, 400);
    return jsonError('Invalid canonical residence payload', 400);
  }
  if (patch.kind === 'absent') return jsonError('A geography payload is required', 400);

  try {
    const result = profile.account_type === 'club'
      ? await (async () => {
          const { data, error: writeError } = await supabase.rpc('update_my_club_geography', {
            p_residence_country_id: patch.residenceCountryId,
            p_residence_geo_area_id: patch.residenceGeoAreaId,
          });
          if (writeError) throw writeError;
          return { status: 'written', data } as const;
        })()
      : await writeMyProfileResidence(supabase, patch);
    return NextResponse.json(result);
  } catch (reason) {
    return jsonError(reason instanceof Error ? reason.message : 'Canonical residence write failed', 400);
  }
});
