import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ELIGIBLE_ACCOUNT_TYPES = new Set(['athlete', 'staff']);

async function ownEligibleProfileId(supabase: any, userId: string) {
  const result = await supabase.from('profiles').select('id,account_type').eq('user_id', userId).maybeSingle();
  if (result.error) throw result.error;
  const profile = result.data as { id?: string; account_type?: string | null } | null;
  if (!profile?.id) return { profileId: null, eligible: false };
  return { profileId: profile.id, eligible: ELIGIBLE_ACCOUNT_TYPES.has(profile.account_type ?? '') };
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profile-geography:INTERESTS:GET:${user.id}`, limit: 60, window: '1m' } as any);
    const { profileId, eligible } = await ownEligibleProfileId(supabase, user.id);
    if (!profileId) return jsonError('Profile not found', 404);
    if (!eligible) return jsonError('Geographic interests are available only to Player and Staff profiles', 403);

    const [preferences, countries, areas] = await Promise.all([
      supabase.from('profile_preferences').select('open_to_relocation').eq('profile_id', profileId).maybeSingle(),
      supabase.from('profile_country_interests').select('country_id,priority,country:countries(id,iso2,official_name)').eq('profile_id', profileId).order('priority'),
      supabase.from('profile_geo_area_interests').select('geo_area_id,priority,area:geo_areas(id,country_id,official_name,area_type)').eq('profile_id', profileId).order('priority'),
    ]);
    for (const result of [preferences, countries, areas]) if (result.error) throw result.error;

    return NextResponse.json({
      data: {
        openToRelocation: preferences.data?.open_to_relocation === true,
        countryInterests: countries.data ?? [],
        geoAreaInterests: areas.data ?? [],
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load geography interests', 400);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profile-geography:INTERESTS:PATCH:${user.id}`, limit: 30, window: '1m' } as any);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const operations = ['openToRelocation', 'countryInterest', 'geoAreaInterest'].filter((key) => key in body);
    if (operations.length !== 1 || Object.keys(body).length !== 1) return jsonError('Exactly one interest operation is required', 400);

    const { profileId, eligible } = await ownEligibleProfileId(supabase, user.id);
    if (!profileId) return jsonError('Profile not found', 404);
    if (!eligible) return jsonError('Geographic interests are available only to Player and Staff profiles', 403);

    if ('openToRelocation' in body) {
      if (typeof body.openToRelocation !== 'boolean') return jsonError('openToRelocation must be boolean', 400);
      const result = await supabase.from('profile_preferences').upsert(
        { profile_id: profileId, open_to_relocation: body.openToRelocation },
        { onConflict: 'profile_id' },
      ).select('open_to_relocation').single();
      if (result.error) throw result.error;
      return NextResponse.json({ data: { openToRelocation: result.data.open_to_relocation === true } });
    }

    if ('countryInterest' in body) {
      const operation = body.countryInterest as { countryId?: unknown; selected?: unknown } | null;
      const countryId = String(operation?.countryId ?? '');
      if (!UUID.test(countryId) || typeof operation?.selected !== 'boolean' || Object.keys(operation ?? {}).some((key) => !['countryId', 'selected'].includes(key))) {
        return jsonError('Invalid country interest', 400);
      }
      const country = await supabase.from('countries').select('id').eq('id', countryId).eq('is_supported', true).eq('is_active', true).maybeSingle();
      if (country.error) throw country.error;
      if (!country.data) return jsonError('Country is not supported and active', 400);
      const result = operation.selected
        ? await supabase.from('profile_country_interests').upsert({ profile_id: profileId, country_id: countryId }, { onConflict: 'profile_id,country_id' })
        : await supabase.from('profile_country_interests').delete().eq('profile_id', profileId).eq('country_id', countryId);
      if (result.error) throw result.error;
      return NextResponse.json({ data: { countryId, selected: operation.selected } });
    }

    const operation = body.geoAreaInterest as { geoAreaId?: unknown; selected?: unknown } | null;
    const geoAreaId = String(operation?.geoAreaId ?? '');
    if (!UUID.test(geoAreaId) || typeof operation?.selected !== 'boolean' || Object.keys(operation ?? {}).some((key) => !['geoAreaId', 'selected'].includes(key))) {
      return jsonError('Invalid geo-area interest', 400);
    }
    const area = await supabase.from('geo_areas').select('id,country:countries!inner(is_supported,is_active)').eq('id', geoAreaId).eq('is_active', true).eq('country.is_supported', true).eq('country.is_active', true).maybeSingle();
    if (area.error) throw area.error;
    if (!area.data) return jsonError('Geo area is not supported and active', 400);
    const result = operation.selected
      ? await supabase.from('profile_geo_area_interests').upsert({ profile_id: profileId, geo_area_id: geoAreaId }, { onConflict: 'profile_id,geo_area_id' })
      : await supabase.from('profile_geo_area_interests').delete().eq('profile_id', profileId).eq('geo_area_id', geoAreaId);
    if (result.error) throw result.error;
    return NextResponse.json({ data: { geoAreaId, selected: operation.selected } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update geography interests', 400);
  }
});
