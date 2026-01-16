import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { normalizeSport } from '@/lib/opps/constants';
import { MAX_SKILLS, parseSkillsInput } from '@/lib/profiles/skills';

export const runtime = 'nodejs';

/* ------------------------ utils di normalizzazione ------------------------ */
function normalizeSpaces(v: string) {
  return v.replace(/\s+/g, ' ').trim();
}
function toTextOrNull(v: unknown, { collapseSpaces = false }: { collapseSpaces?: boolean } = {}) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  if (t === '') return null;
  return collapseSpaces ? normalizeSpaces(t) : t;
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

  // atleta (solo per account_type=athlete)
  birth_year: 'number',
  birth_place: 'text',
  city: 'text',

  // residenza (IT) – solo atleta
  residence_region_id: 'number',
  residence_province_id: 'number',
  residence_municipality_id: 'number',

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

  // compat vecchi form
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

  if (error) return jsonError(error.message, 400);
  let isVerified: boolean | null = null;
  if (data?.id && data?.account_type === 'club') {
    const { data: verification, error: verificationError } = await supabase
      .from('club_verification_requests_view')
      .select('is_verified')
      .eq('club_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verificationError) return jsonError(verificationError.message, 400);
    isVerified = verification?.is_verified ?? null;
  }

  return NextResponse.json({ data: data ? { ...data, is_verified: isVerified } : null });
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
  const collapseText = new Set(['city', 'interest_city', 'region', 'province', 'interest_region', 'interest_province']);
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
    if (kind === 'text') updates[key] = toTextOrNull(val, { collapseSpaces: collapseText.has(key) });
    if (kind === 'number') updates[key] = toNumberOrNull(val);
    if (kind === 'bool') updates[key] = toBool(val);
    if (kind === 'json') updates[key] = toJsonOrNull(val);
  }

  if (updates.sport) updates.sport = normalizeSport(updates.sport) ?? updates.sport;
  if (updates.interest_country === undefined) updates.interest_country = 'IT';
  if (updates.country) updates.country = updates.country.toString().trim().toUpperCase();
  if (updates.interest_country) updates.interest_country = updates.interest_country.toString().trim().toUpperCase();
  if (updates.birth_country) updates.birth_country = updates.birth_country.toString().trim().toUpperCase();

  const shouldResolveInterestLabels =
    updates.interest_country === 'IT' &&
    ((updates.interest_municipality_id && !updates.interest_city) ||
      (updates.interest_province_id && !updates.interest_province) ||
      (updates.interest_region_id && !updates.interest_region));

  if (shouldResolveInterestLabels) {
    const [municipalityRes, provinceRes, regionRes] = await Promise.all([
      updates.interest_municipality_id
        ? supabase.from('municipalities').select('name').eq('id', updates.interest_municipality_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      updates.interest_province_id
        ? supabase.from('provinces').select('name').eq('id', updates.interest_province_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      updates.interest_region_id
        ? supabase.from('regions').select('name').eq('id', updates.interest_region_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!updates.interest_city && municipalityRes.data?.name) {
      updates.interest_city = municipalityRes.data.name;
    }
    if (!updates.interest_province && provinceRes.data?.name) {
      updates.interest_province = provinceRes.data.name;
    }
    if (!updates.interest_region && regionRes.data?.name) {
      updates.interest_region = regionRes.data.name;
    }
  }

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
