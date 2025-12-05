import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

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
const MAX_SKILLS = 10;
const MAX_SKILL_LENGTH = 40;

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

type SkillRow = { name: string; endorsements_count: number };

function normalizeSkillName(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const name = String(v).trim();
  if (!name) return null;
  if (name.length > MAX_SKILL_LENGTH) return name.slice(0, MAX_SKILL_LENGTH);
  return name;
}

function parseSkills(raw: unknown): SkillRow[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  let arr: unknown[] | null = null;
  if (Array.isArray(raw)) arr = raw;
  if (!arr && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as unknown[];
    } catch {
      arr = null;
    }
  }
  if (!arr) return null;

  const skills: SkillRow[] = [];
  for (const item of arr) {
    if (skills.length >= MAX_SKILLS) break;
    if (!item || typeof item !== 'object') continue;
    const name = normalizeSkillName((item as any).name);
    if (!name) continue;
    const endorsementsCount = Number((item as any).endorsements_count ?? (item as any).endorsementsCount ?? 0);
    const safeCount = Number.isFinite(endorsementsCount) && endorsementsCount > 0
      ? Math.floor(endorsementsCount)
      : 0;
    skills.push({ name, endorsements_count: safeCount });
  }

  return skills.slice(0, MAX_SKILLS);
}

/** campi ammessi in PATCH */
const FIELDS: Record<string, 'text' | 'number' | 'bool' | 'json'> = {
  // anagrafica comune
  full_name: 'text',
  display_name: 'text',
  avatar_url: 'text',
  bio: 'text',
  country: 'text', // nazionalità

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
      const parsed = parseSkills(val);
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