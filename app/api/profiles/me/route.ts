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

<<<<<<< HEAD
/** campi ammessi in PATCH */
=======
function normalizeFoot(value: unknown) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (['right', 'destro', 'dx', 'r'].includes(raw)) return 'right';
  if (['left', 'sinistro', 'sx', 'l'].includes(raw)) return 'left';
  if (['both', 'ambidestro', 'ambi', 'ambidex', 'ambidextrous'].includes(raw)) return 'both';
  return null;
}

/** Mappa dei campi ammessi in PATCH e del tipo */
>>>>>>> codex/verify-repository-correctness
const FIELDS: Record<string, 'text' | 'number' | 'bool' | 'json'> = {
  // anagrafica comune
  full_name: 'text',
  display_name: 'text',
  bio: 'text',
<<<<<<< HEAD
  country: 'text', // nazionalità

  // atleta (solo per account_type=athlete)
=======
  avatar_url: 'text',
  city: 'text',            // residenza
>>>>>>> codex/verify-repository-correctness
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

  // notifiche
  notify_email_new_message: 'bool',

  // onboarding
  account_type: 'text',

  // --------- NUOVI CAMPI CLUB ----------
  club_foundation_year: 'number',
  club_stadium: 'text',
  club_league_category: 'text',
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
    if (kind === 'text') updates[key] = toTextOrNull(val);
    if (kind === 'number') updates[key] = toNumberOrNull(val);
    if (kind === 'bool') updates[key] = toBool(val);
    if (kind === 'json') updates[key] = toJsonOrNull(val);
  }

<<<<<<< HEAD
  if (updates.interest_country === undefined) updates.interest_country = 'IT';

=======
  if (Object.prototype.hasOwnProperty.call(updates, 'foot')) {
    updates.foot = normalizeFoot(updates.foot);
  }

  // default coerente (Italia) se non impostato
  if (updates.interest_country === undefined) updates.interest_country = 'IT';

  // 1) tentativo di UPDATE
>>>>>>> codex/verify-repository-correctness
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