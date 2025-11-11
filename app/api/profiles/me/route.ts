// app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

type AccountType = 'club' | 'athlete' | null;

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

type ProfilePayload = {
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;

  birth_year?: number | null;
  birth_place?: string | null;

  city?: string | null;
  country?: string | null;

  sport?: string | null;
  role?: string | null;

  foot?: 'destro' | 'sinistro' | 'ambidestro' | null;
  height_cm?: number | null;
  weight_kg?: number | null;

  interest_country?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;

  links?: Links | null;

  notify_email_new_message?: boolean | null;
};

function normalizeAccountType(raw: any): AccountType {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'club') return 'club';
  if (v === 'athlete' || v === 'atleta') return 'athlete';
  return null;
}

function normalizeFoot(raw: any): ProfilePayload['foot'] {
  const v = String(raw ?? '').toLowerCase();
  if (!v) return null;
  if (['destro', 'right', 'dx', 'r'].includes(v)) return 'destro';
  if (['sinistro', 'left', 'sx', 'l'].includes(v)) return 'sinistro';
  if (['ambidestro', 'ambi', 'both'].includes(v)) return 'ambidestro';
  return null;
}

function sanitizeLinks(raw: any): Links | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Links = {};
  const src = raw as Record<string, any>;

  const set = (key: keyof Links) => {
    const v = (src[key] ?? '').toString().trim();
    if (!v) return;
    out[key] = v;
  };

  set('instagram');
  set('facebook');
  set('tiktok');
  set('x');

  return Object.keys(out).length ? out : null;
}

function pickPatchBody(body: any): ProfilePayload {
  if (!body || typeof body !== 'object') return {};

  const b = body as Record<string, any>;

  const cleanNumber = (v: any): number | null => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const payload: ProfilePayload = {
    full_name: b.full_name?.toString().trim() || null,
    bio: b.bio?.toString().trim() || null,
    avatar_url: b.avatar_url?.toString().trim() || null,

    birth_year: cleanNumber(b.birth_year),
    birth_place: b.birth_place?.toString().trim() || null,

    city: b.city?.toString().trim() || null,
    country: b.country?.toString().trim() || null,

    sport: b.sport?.toString().trim() || null,
    role: b.role?.toString().trim() || null,

    foot: normalizeFoot(b.foot),
    height_cm: cleanNumber(b.height_cm),
    weight_kg: cleanNumber(b.weight_kg),

    interest_country: (b.interest_country || 'IT').toString().trim() || 'IT',
    interest_region_id: cleanNumber(b.interest_region_id),
    interest_province_id: cleanNumber(b.interest_province_id),
    interest_municipality_id: cleanNumber(b.interest_municipality_id),

    links: sanitizeLinks(b.links),

    notify_email_new_message:
      typeof b.notify_email_new_message === 'boolean'
        ? b.notify_email_new_message
        : null,
  };

  // ripuliamo le chiavi undefined per non scrivere roba sporca
  Object.keys(payload).forEach((k) => {
    if ((payload as any)[k] === undefined) {
      delete (payload as any)[k];
    }
  });

  return payload;
}

/**
 * GET /api/profiles/me
 * Ritorna { user, profile } con account_type normalizzato.
 */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  // profilo esistente (by user_id, compat con eventuale colonna id legacy)
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  const account_type =
    normalizeAccountType(profileRow?.account_type) ??
    normalizeAccountType(user.user_metadata?.account_type) ??
    normalizeAccountType(user.user_metadata?.role);

  const profile = {
    ...profileRow,
    account_type,
  };

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
});

/**
 * PATCH /api/profiles/me
 * Upsert sicuro del profilo autenticato.
 */
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const patch = pickPatchBody(body);

  // difesa extra sul foot_check: se arriva qualcosa di invalido → null
  if (patch.foot && !['destro', 'sinistro', 'ambidestro'].includes(patch.foot)) {
    patch.foot = null;
  }

  // account_type: non forziamo da form, ma se il record non c'è proviamo a dedurlo dai metadata
  const account_type =
    normalizeAccountType(body.account_type) ??
    normalizeAccountType(user.user_metadata?.account_type) ??
    normalizeAccountType(user.user_metadata?.role) ??
    null;

  const baseRow: any = {
    user_id: user.id,
    account_type,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  // Se non esiste ancora nessun profilo per l'utente, impostiamo created_at ora.
  // Supabase upsert con onConflict:user_id evita il duplicate key.
  const { data, error } = await supabase
    .from('profiles')
    .upsert(baseRow, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    // Esponiamo un codice chiaro al client (ProfileEditForm mostra profile_update_failed)
    return NextResponse.json(
      { error: error.message || 'profile_update_failed' },
      { status: 400 }
    );
  }

  const normalized = {
    ...data,
    account_type:
      normalizeAccountType(data.account_type) ??
      normalizeAccountType(user.user_metadata?.account_type) ??
      normalizeAccountType(user.user_metadata?.role),
  };

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: normalized,
    },
    { status: 200 }
  );
});
