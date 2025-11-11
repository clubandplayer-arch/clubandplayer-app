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

type ProfileRow = {
  user_id: string;
  account_type: string | null;

  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;

  birth_year: number | null;
  birth_place: string | null;

  city: string | null;
  country: string | null;

  sport: string | null;
  role: string | null;

  foot: 'destro' | 'sinistro' | 'ambidestro' | null;
  height_cm: number | null;
  weight_kg: number | null;

  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  links: Links | null;

  notify_email_new_message: boolean | null;
};

type PatchBody = Partial<ProfileRow>;

const ALLOWED_FEET = ['destro', 'sinistro', 'ambidestro'] as const;

function normalizeAccountType(raw: any): AccountType {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'club') return 'club';
  if (v === 'athlete' || v === 'atleta') return 'athlete';
  return null;
}

function normalizeFoot(raw: any): ProfileRow['foot'] {
  const v = String(raw ?? '').toLowerCase().trim();
  if (!v) return null;
  if (ALLOWED_FEET.includes(v as any)) return v as any;
  if (['right', 'dx', 'r'].includes(v)) return 'destro';
  if (['left', 'sx', 'l'].includes(v)) return 'sinistro';
  if (['ambi', 'both'].includes(v)) return 'ambidestro';
  return null;
}

function sanitizeLinks(raw: any): Links | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, any>;
  const out: Links = {};

  const set = (k: keyof Links) => {
    const v = (src[k] ?? '').toString().trim();
    if (v) out[k] = v;
  };

  set('instagram');
  set('facebook');
  set('tiktok');
  set('x');

  return Object.keys(out).length ? out : null;
}

function numOrNull(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickPatchBody(body: any): PatchBody {
  if (!body || typeof body !== 'object') return {};

  const b = body as Record<string, any>;

  const patch: PatchBody = {
    full_name: b.full_name?.toString().trim() || null,
    bio: b.bio?.toString().trim() || null,
    avatar_url: b.avatar_url?.toString().trim() || null,

    birth_year: numOrNull(b.birth_year),
    birth_place: b.birth_place?.toString().trim() || null,

    city: b.city?.toString().trim() || null,
    country: b.country?.toString().trim() || null,

    sport: b.sport?.toString().trim() || null,
    role: b.role?.toString().trim() || null,

    foot: normalizeFoot(b.foot),
    height_cm: numOrNull(b.height_cm),
    weight_kg: numOrNull(b.weight_kg),

    interest_country:
      b.interest_country?.toString().trim() || undefined,
    interest_region_id: numOrNull(b.interest_region_id) ?? undefined,
    interest_province_id:
      numOrNull(b.interest_province_id) ?? undefined,
    interest_municipality_id:
      numOrNull(b.interest_municipality_id) ?? undefined,

    links: sanitizeLinks(b.links) ?? undefined,

    // lo normalizziamo dopo; qui prendiamo solo se è boolean
    notify_email_new_message:
      typeof b.notify_email_new_message === 'boolean'
        ? b.notify_email_new_message
        : undefined,
  };

  // rimuovi undefined così non scriviamo colonne a caso
  Object.keys(patch).forEach((k) => {
    if ((patch as any)[k] === undefined) {
      delete (patch as any)[k];
    }
  });

  return patch;
}

/* ========== GET /api/profiles/me ========== */

export const GET = withAuth(async (_req, { supabase, user }) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  const account_type =
    normalizeAccountType(data?.account_type) ??
    normalizeAccountType(user.user_metadata?.account_type) ??
    normalizeAccountType(user.user_metadata?.role);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: data
      ? {
          ...data,
          account_type,
        }
      : {
          user_id: user.id,
          account_type,
        },
  });
});

/* ========== PATCH /api/profiles/me ========== */

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const supabase = ctx.supabase;
  const user = ctx.user;

  let raw: any = {};
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }

  const patch = pickPatchBody(raw);

  // leggi eventuale profilo esistente per merge sicuro
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError && readError.code !== 'PGRST116') {
    // errore reale diverso da "no rows"
    return jsonError(readError.message, 500);
  }

  const existingRow = (existing as ProfileRow | null) ?? null;

  const account_type: AccountType =
    normalizeAccountType(raw.account_type) ??
    normalizeAccountType(existingRow?.account_type) ??
    normalizeAccountType(user.user_metadata?.account_type) ??
    normalizeAccountType(user.user_metadata?.role) ??
    null;

  // FOOT: scegliamo in ordine: patch valido -> existing valido -> null
  let foot: ProfileRow['foot'] = null;
  if (patch.foot && ALLOWED_FEET.includes(patch.foot)) {
    foot = patch.foot;
  } else if (
    existingRow?.foot &&
    ALLOWED_FEET.includes(existingRow.foot)
  ) {
    foot = existingRow.foot;
  }

  // NOTIFY EMAIL: la colonna è NOT NULL → sempre boolean
  const notify_email_new_message: boolean =
    typeof patch.notify_email_new_message === 'boolean'
      ? patch.notify_email_new_message
      : typeof existingRow?.notify_email_new_message === 'boolean'
      ? existingRow.notify_email_new_message
      : true;

  const row: ProfileRow = {
    user_id: user.id,
    account_type: account_type,

    full_name:
      patch.full_name ?? existingRow?.full_name ?? null,
    bio: patch.bio ?? existingRow?.bio ?? null,
    avatar_url:
      patch.avatar_url ?? existingRow?.avatar_url ?? null,

    birth_year:
      patch.birth_year ?? existingRow?.birth_year ?? null,
    birth_place:
      patch.birth_place ?? existingRow?.birth_place ?? null,

    city: patch.city ?? existingRow?.city ?? null,
    country: patch.country ?? existingRow?.country ?? null,

    sport: patch.sport ?? existingRow?.sport ?? null,
    role: patch.role ?? existingRow?.role ?? null,

    foot, // già normalizzato e sempre valido o null
    height_cm:
      patch.height_cm ?? existingRow?.height_cm ?? null,
    weight_kg:
      patch.weight_kg ?? existingRow?.weight_kg ?? null,

    interest_country:
      patch.interest_country ??
      existingRow?.interest_country ??
      'IT',
    interest_region_id:
      patch.interest_region_id ??
      existingRow?.interest_region_id ??
      null,
    interest_province_id:
      patch.interest_province_id ??
      existingRow?.interest_province_id ??
      null,
    interest_municipality_id:
      patch.interest_municipality_id ??
      existingRow?.interest_municipality_id ??
      null,

    links:
      patch.links !== undefined
        ? patch.links
        : existingRow?.links ?? null,

    notify_email_new_message,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          'profile_update_failed',
      },
      { status: 400 }
    );
  }

  const normalizedAccountType =
    normalizeAccountType(data?.account_type) ?? account_type;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      ...data,
      account_type: normalizedAccountType,
    },
  });
});
