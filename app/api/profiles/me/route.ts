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

function normalizeFoot(value: unknown) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (['destro', 'right', 'dx', 'r'].includes(raw)) return 'destro';
  if (['sinistro', 'left', 'sx', 'l'].includes(raw)) return 'sinistro';
  if (['ambidestro', 'both', 'ambi', 'ambidex', 'ambidextrous'].includes(raw)) return 'ambidestro';
  return null;
}

/** Mappa dei campi ammessi in PATCH e del tipo */
const FIELDS: Record<string, 'text' | 'number' | 'bool' | 'json'> = {
  // anagrafica
  full_name: 'text',
  display_name: 'text',
  bio: 'text',
  avatar_url: 'text',
  city: 'text',            // residenza
  birth_year: 'number',
  birth_place: 'text',     // NEW: luogo di nascita (città)
  country: 'text',         // NAZIONALITÀ (ISO2 o nome)

  // atleta
  foot: 'text',
  height_cm: 'number',
  weight_kg: 'number',
  sport: 'text',
  role: 'text',
  visibility: 'text',

  // interesse geografico (DB-driven)
  interest_country: 'text',
  interest_region_id: 'number',
  interest_province_id: 'number',
  interest_municipality_id: 'number',

  // compat vecchi form (stringhe)
  interest_region: 'text',
  interest_province: 'text',
  interest_city: 'text',

  // social links (JSON: {instagram, facebook, tiktok, x})
  links: 'json',

  // notifiche
  notify_email_new_message: 'bool',

  // onboarding ruolo
  account_type: 'text',
};

/* ---------------------------------- GET ---------------------------------- */
/** GET /api/profiles/me — profilo dell’utente loggato (sempre { data }) */
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
/** PATCH /api/profiles/me — aggiorna i campi whitelisted del proprio profilo */
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:PATCH:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Costruisci l’oggetto updates filtrando e normalizzando
  const updates: Record<string, any> = {};
  for (const [key, kind] of Object.entries(FIELDS)) {
    if (!(key in body)) continue;
    const val = body[key];
    if (kind === 'text') updates[key] = toTextOrNull(val);
    if (kind === 'number') updates[key] = toNumberOrNull(val);
    if (kind === 'bool') updates[key] = toBool(val);
    if (kind === 'json') updates[key] = toJsonOrNull(val);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'foot')) {
    updates.foot = normalizeFoot(updates.foot);
  }

  // default coerente (Italia) se non impostato
  if (updates.interest_country === undefined) updates.interest_country = 'IT';

  // 1) tentativo di UPDATE
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  // 2) se non esiste riga, fai UPSERT difensivo
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
