// app/api/profiles/me/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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
 * Crea un client Supabase server-side usando lo stesso pattern
 * già usato nel progetto (cookies get/set/remove).
 */
function createSupabase(req: NextRequest) {
  const { url, anon } = resolveEnv();

  // response "carrier" per applicare le modifiche ai cookie
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

/**
 * Seleziona solo i campi ammessi per il profilo.
 * (Compat con schema CODEX/Club&Player esistente)
 */
function pickProfilePayload(body: any): Record<string, any> {
  if (!body || typeof body !== 'object') return {};

  const allowed: string[] = [
    'display_name',
    'full_name',
    'account_type',
    'type', // legacy → normalizzato sotto
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

/**
 * GET /api/profiles/me
 * Ritorna il profilo dell'utente corrente (o null se non presente).
 */
export async function GET(req: NextRequest) {
  const { supabase, carrier } = createSupabase(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json({ data: null }, { status: 401 });
    mergeCookies(carrier, out);
    return out;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    const out = NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
    mergeCookies(carrier, out);
    return out;
  }

  const out = NextResponse.json({ data: data ?? null });
  mergeCookies(carrier, out);
  return out;
}

/**
 * PATCH /api/profiles/me
 * Upsert del profilo collegato all'utente loggato.
 * - Nessuna differenza tra login Google / email+password.
 * - Usa id utente Supabase come PK del profilo.
 */
export async function PATCH(req: NextRequest) {
  const { supabase, carrier } = createSupabase(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const out = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
    mergeCookies(carrier, out);
    return out;
  }

  const body = await req.json().catch(() => ({}));
  const patch = pickProfilePayload(body);

  // Normalizza account_type per compat
  if (typeof patch.account_type === 'string') {
    patch.account_type = patch.account_type.toLowerCase();
  }
  if (!patch.account_type && typeof patch.type === 'string') {
    const t = patch.type.toLowerCase();
    if (t.startsWith('club')) patch.account_type = 'club';
    else if (t === 'athlete') patch.account_type = 'athlete';
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        ...patch,
        updated_at: now,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    const out = NextResponse.json(
      { error: error.message },
      { status: 400 },
    );
    mergeCookies(carrier, out);
    return out;
  }

  const out = NextResponse.json({ data });
  mergeCookies(carrier, out);
  return out;
}
