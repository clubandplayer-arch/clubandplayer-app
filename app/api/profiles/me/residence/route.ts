import { NextResponse, type NextRequest } from 'next/server';

import { withAuth, jsonError } from '@/lib/api/auth';
import { isCanonicalProfileResidenceUiEnabled, isCanonicalProfileResidenceWriteEnabled } from '@/lib/env/features';
import { getProfileGeography } from '@/lib/geo/profileGeography';
import { SupabaseProfileGeographyRepository } from '@/lib/geo/profileGeography.server';
import { writeMyProfileResidence } from '@/lib/geo/profileResidenceWrite.server';
import { parseResidencePatch, ResidenceContractError } from '@/lib/geo/profileResidenceWriteContract';

export const runtime = 'nodejs';

const eligible = (accountType: string | null | undefined) => accountType === 'athlete' || accountType === 'staff';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  if (!isCanonicalProfileResidenceUiEnabled()) {
    return NextResponse.json({ enabled: false, writable: false, residence: null });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,account_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!profile) return jsonError('Profile not found', 404);
  if (!eligible(profile.account_type)) return jsonError('Canonical residence is limited to Player and Staff', 403);

  try {
    const geography = await getProfileGeography(new SupabaseProfileGeographyRepository(supabase), profile.id);
    return NextResponse.json({
      enabled: true,
      writable: isCanonicalProfileResidenceWriteEnabled(),
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
  // The kill switch is checked before profile lookup or RPC invocation.
  if (!isCanonicalProfileResidenceWriteEnabled()) {
    return jsonError('Canonical residence writes are disabled pending Supabase certification', 503);
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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!profile) return jsonError('Profile not found', 404);
  if (!eligible(profile.account_type)) return jsonError('Canonical residence is limited to Player and Staff', 403);

  try {
    const result = await writeMyProfileResidence(supabase, patch);
    return NextResponse.json(result);
  } catch (reason) {
    return jsonError(reason instanceof Error ? reason.message : 'Canonical residence write failed', 400);
  }
});
