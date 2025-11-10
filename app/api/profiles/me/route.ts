export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/* -------------------------- Supabase SSR helper -------------------------- */

function resolveEnv() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '';
  if (!url || !anon) {
    throw new Error('Supabase env missing for profiles/me');
  }
  return { url, anon };
}

/**
 * Crea un client Supabase server-side usando i cookie della request
 * e una NextResponse "carrier" per propagare eventuali modifiche.
 */
function createSupabase(req: NextRequest) {
  const { url, anon } = resolveEnv();

  const res = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0,
        });
      },
    },
  });

  return { supabase, carrier: res };
}

function mergeCookies(from: NextResponse, into: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    into.cookies.set(cookie);
  }
}

/* ------------------------ Normalizzazione profilo ------------------------ */

function pickProfilePayload(body: any): Record<string, any> {
  if (!body || typeof body !== 'object') return {};

  const allowed: string[] = [
    'display_name',
    'full_name',
    'account_type',
    'type', // legacy
    'country',
    'birth_date',
    'birth_country',
    'birth_place',
    'birth_region_id',
    'birth_province_id',
    'birth_municipality_id',
    'residence_region_id',
    'residence_province_id',
    'residence_municipality_id',
    'residence_city_extra',
    'sport',
    'role',
    'foot',
    'height_cm',
    'weight_kg',
    'club_league_category',
    'club_foundation_year',
    'club_stadium',
    'avatar_url',
    'bio',
  ];

  const patch: Record<string, any> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      patch[key] = body[key];
    }
  }
  return patch;
}

function normalizeAccountType(row: any | null): 'club' | 'athlete' | null {
  if (!row) return null;

  const raw = (
    row.account_type ??
    row.profile_type ??
    row.type ??
    ''
  )
    .toString()
    .toLowerCase();

  if (raw.includes('club')) return 'club';
  if (raw.includes('athlete') || raw.includes('atlet')) return 'athlete';

  if (row.club_league_category || row.club_foundation_year || row.club_stadium) {
    return 'club';
  }

  return 'athlete';
}

/* ---------------------------------- GET ---------------------------------- */
/**
 * GET /api/profiles/me
 * Ritorna { user, data } con account_type normalizzato.
 */
export async function GET(req: NextRequest) {
  const { supabase, carrier } = createSupabase(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const out = NextResponse.json({ user: null, data: null }, { status: 401 });
    mergeCookies(carrier, out);
    return out;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    console.error('[profiles/me] select error', error);
    const out = NextResponse.json({ error: error.message }, { status: 500 });
    mergeCookies(carrier, out);
    return out;
  }

  const account_type = normalizeAccountType(data);
  const normalized = data ? { ...data, account_type } : null;

  const out = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    data: normalized,
  });

  mergeCookies(carrier, out);
  return out;
}

/* --------------------------------- PATCH --------------------------------- */
/**
 * PATCH /api/profiles/me
 * Upsert del profilo:
 * - usa id = user.id come PK "nuovo standard"
 * - valorizza SEMPRE user_id = user.id per compat legacy
 */
export async function PATCH(req: NextRequest) {
  const { supabase, carrier } = createSupabase(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const out = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mergeCookies(carrier, out);
    return out;
  }

  const body = await req.json().catch(() => ({}));
  const patch = pickProfilePayload(body);

  if (typeof patch.account_type === 'string') {
    const t = patch.account_type.toLowerCase();
    if (t.includes('club')) patch.account_type = 'club';
    else if (t.includes('athlete') || t.includes('atlet')) patch.account_type = 'athlete';
  } else if (typeof patch.type === 'string') {
    const t = patch.type.toLowerCase();
    if (t.includes('club')) patch.account_type = 'club';
    else if (t.includes('athlete') || t.includes('atlet')) patch.account_type = 'athlete';
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        user_id: user.id,
        ...patch,
        updated_at: now,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    console.error('[profiles/me] upsert error', error);
    const out = NextResponse.json({ error: error.message }, { status: 400 });
    mergeCookies(carrier, out);
    return out;
  }

  const account_type = normalizeAccountType(data);
  const normalized = { ...data, account_type };

  const out = NextResponse.json({ data: normalized });
  mergeCookies(carrier, out);
  return out;
}
