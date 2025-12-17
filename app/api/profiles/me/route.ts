import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { MAX_SKILLS, parseSkillsInput } from '@/lib/profiles/skills';

export const runtime = 'nodejs';

/* ------------------------ utils di normalizzazione ------------------------ */
function toTextOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}
function toNumberOrNull(v: unknown) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toBool(v: unknown) {
  return !!v;
}
function toJsonOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof v === 'object') {
    if (v && Object.keys(v as Record<string, unknown>).length === 0) return null;
    return v as Record<string, unknown>;
  }
  return null;
}

/** campi ammessi in PATCH */
const FIELDS: Record<string, 'text' | 'number' | 'bool' | 'json'> = {
  // anagrafica comune
  full_name: 'text',
  display_name: 'text',
  avatar_url: 'text',
  bio: 'text',
  country: 'text', // nazionalità
  region: 'text',
  province: 'text',
  region_id: 'number',
  province_id: 'number',
  municipality_id: 'number',

  // atleta (solo per account_type=athlete)
  birth_year: 'number',
  birth_place: 'text',
  city: 'text',

  // nascita (IT) – solo atleta
  birth_country: 'text',
  birth_region_id: 'number',
  birth_province_id: 'number',
  birth_municipality_id: 'number',

  // atleta
  foot: 'text',
  height_cm: 'number',
  weight_kg: 'number',
  sport: 'text',
  role: 'text',
  visibility: 'text',

  // interesse geo (comune)
  interest_country: 'text',
  interest_region_id: 'number',
  interest_province_id: 'number',
  interest_municipality_id: 'number',
  interest_region: 'text',
  interest_province: 'text',
  interest_city: 'text',

  // social
  links: 'json',
  skills: 'json',

  // notifiche
  notify_email_new_message: 'bool',

  // onboarding
  account_type: 'text',

  // --------- NUOVI CAMPI CLUB ----------
  club_foundation_year: 'number',
  club_stadium: 'text',
  club_stadium_address: 'text',
  club_stadium_lat: 'number',
  club_stadium_lng: 'number',
  club_league_category: 'text',
  club_motto: 'text',
  // -------------------------------------
};

/* ---------------------------------- GET ---------------------------------- */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (data) {
    const profile = { ...(data as any) };
    const regionIds = new Set<number>();
    const provinceIds = new Set<number>();
    const municipalityIds = new Set<number>();

    const pushNumber = (set: Set<number>, v: any) => {
      const n = Number(v);
      if (Number.isFinite(n)) set.add(n);
    };

    pushNumber(regionIds, profile.region_id);
    pushNumber(regionIds, profile.residence_region_id);
    pushNumber(regionIds, profile.interest_region_id);
    pushNumber(provinceIds, profile.province_id);
    pushNumber(provinceIds, profile.residence_province_id);
    pushNumber(provinceIds, profile.interest_province_id);
    pushNumber(municipalityIds, profile.municipality_id);
    pushNumber(municipalityIds, profile.residence_municipality_id);
    pushNumber(municipalityIds, profile.interest_municipality_id);

    const [regionRows, provinceRows, municipalityRows] = await Promise.all([
      regionIds.size
        ? supabase.from('regions').select('id,name').in('id', Array.from(regionIds))
        : Promise.resolve({ data: [] }),
      provinceIds.size
        ? supabase.from('provinces').select('id,name').in('id', Array.from(provinceIds))
        : Promise.resolve({ data: [] }),
      municipalityIds.size
        ? supabase.from('municipalities').select('id,name').in('id', Array.from(municipalityIds))
        : Promise.resolve({ data: [] }),
    ]);

    const regionMap = new Map<number, string>();
    const provinceMap = new Map<number, string>();
    const municipalityMap = new Map<number, string>();
    (regionRows.data || []).forEach((r: any) => regionMap.set(Number(r.id), r.name));
    (provinceRows.data || []).forEach((r: any) => provinceMap.set(Number(r.id), r.name));
    (municipalityRows.data || []).forEach((r: any) => municipalityMap.set(Number(r.id), r.name));

    const ensureBaseLocation = profile.country === 'IT';
    const ensureInterestLocation = (profile.interest_country || profile.country) === 'IT';

    const pickBaseRegionId = profile.region_id ?? profile.residence_region_id ?? null;
    const pickBaseProvinceId = profile.province_id ?? profile.residence_province_id ?? null;
    const pickBaseMunicipalityId = profile.municipality_id ?? profile.residence_municipality_id ?? null;

    if (ensureBaseLocation) {
      if (!profile.region && pickBaseRegionId && regionMap.has(pickBaseRegionId)) {
        profile.region = regionMap.get(pickBaseRegionId);
      }
      if (!profile.province && pickBaseProvinceId && provinceMap.has(pickBaseProvinceId)) {
        profile.province = provinceMap.get(pickBaseProvinceId);
      }
      if (!profile.city && pickBaseMunicipalityId && municipalityMap.has(pickBaseMunicipalityId)) {
        profile.city = municipalityMap.get(pickBaseMunicipalityId);
      }
    }

    if (ensureInterestLocation) {
      if (!profile.interest_region && profile.interest_region_id && regionMap.has(profile.interest_region_id)) {
        profile.interest_region = regionMap.get(profile.interest_region_id);
      }
      if (!profile.interest_province && profile.interest_province_id && provinceMap.has(profile.interest_province_id)) {
        profile.interest_province = provinceMap.get(profile.interest_province_id);
      }
      if (!profile.interest_city && profile.interest_municipality_id && municipalityMap.has(profile.interest_municipality_id)) {
        profile.interest_city = municipalityMap.get(profile.interest_municipality_id);
      }
    }

    return NextResponse.json({ data: profile });
  }

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? null });
});

/* --------------------------------- PATCH --------------------------------- */
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:PATCH:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const updates: Record<string, any> = {};
  for (const [key, kind] of Object.entries(FIELDS)) {
    if (!(key in body)) continue;
    const val = body[key];
    if (key === 'skills') {
      if (Array.isArray(val) && val.length > MAX_SKILLS) return jsonError('Massimo 10 competenze', 400);
      const parsed = parseSkillsInput(val);
      if (parsed === undefined) continue;
      updates.skills = parsed;
      continue;
    }
    if (kind === 'text') updates[key] = toTextOrNull(val);
    if (kind === 'number') updates[key] = toNumberOrNull(val);
    if (kind === 'bool') updates[key] = toBool(val);
    if (kind === 'json') updates[key] = toJsonOrNull(val);
  }

  if (updates.interest_country === undefined) updates.interest_country = 'IT';

  let currentProfile: { account_type: string | null; role: string | null } | null = null;
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('account_type, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) currentProfile = existingProfile;

  const effectiveAccountType = ((updates.account_type as string | null | undefined) ?? currentProfile?.account_type ?? null) as
    | string
    | null;
  if (effectiveAccountType === 'club') {
    updates.role = 'Club';
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (!data && !error) {
    const up = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    if (up.error) return jsonError(up.error.message, 400);
    return NextResponse.json({ data: up.data });
  }

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
