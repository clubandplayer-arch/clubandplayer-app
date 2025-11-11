// app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  links: Links | null;

  notify_email_new_message: boolean | null;
};

function normalizeAccountType(raw: any): AccountType {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'club') return 'club';
  if (v === 'athlete' || v === 'atleta') return 'athlete';
  return null;
}

/**
 * Mappa qualsiasi input (IT/EN) nei soli valori ammessi dal check:
 *   'left' | 'right' | 'both'
 */
function normalizeFoot(raw: any): 'left' | 'right' | 'both' | null {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();

  if (['right', 'dx', 'destro', 'r'].includes(v)) return 'right';
  if (['left', 'sx', 'sinistro', 'l'].includes(v)) return 'left';
  if (['both', 'ambi', 'ambidestro'].includes(v)) return 'both';

  return null;
}

function sanitizeLinks(raw: any): Links | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, any>;
  const out: Links = {};

  const take = (k: keyof Links) => {
    const v = (src[k] ?? '').toString().trim();
    if (v) out[k] = v;
  };

  take('instagram');
  take('facebook');
  take('tiktok');
  take('x');

  return Object.keys(out).length ? out : null;
}

function numOrNull(v: any): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Estrae solo i campi che il form può toccare.
 * NON forza valori di default: quelli li gestiamo dopo.
 */
function pickPatch(body: any): Partial<ProfileRow> {
  if (!body || typeof body !== 'object') return {};

  const b = body as Record<string, any>;
  const patch: Partial<ProfileRow> = {};

  if ('full_name' in b) patch.full_name = (b.full_name || '').toString().trim() || null;
  if ('bio' in b) patch.bio = (b.bio || '').toString().trim() || null;
  if ('avatar_url' in b) patch.avatar_url = (b.avatar_url || '').toString().trim() || null;

  if ('birth_year' in b) patch.birth_year = numOrNull(b.birth_year);
  if ('birth_place' in b) patch.birth_place = (b.birth_place || '').toString().trim() || null;

  if ('city' in b) patch.city = (b.city || '').toString().trim() || null;
  if ('country' in b) patch.country = (b.country || '').toString().trim() || null;

  if ('sport' in b) patch.sport = (b.sport || '').toString().trim() || null;
  if ('role' in b) patch.role = (b.role || '').toString().trim() || null;

  if ('height_cm' in b) patch.height_cm = numOrNull(b.height_cm);
  if ('weight_kg' in b) patch.weight_kg = numOrNull(b.weight_kg);

  if ('interest_country' in b) {
    const v = (b.interest_country || '').toString().trim();
    patch.interest_country = v || null;
  }
  if ('interest_region_id' in b) patch.interest_region_id = numOrNull(b.interest_region_id);
  if ('interest_province_id' in b) patch.interest_province_id = numOrNull(b.interest_province_id);
  if ('interest_municipality_id' in b)
    patch.interest_municipality_id = numOrNull(b.interest_municipality_id);

  if ('links' in b) patch.links = sanitizeLinks(b.links);

  if ('notify_email_new_message' in b) {
    patch.notify_email_new_message =
      typeof b.notify_email_new_message === 'boolean'
        ? b.notify_email_new_message
        : null;
  }

  // foot lo trattiamo separatamente perché è sotto check constraint
  if ('foot' in b) {
    const f = normalizeFoot(b.foot);
    if (f) {
      patch.foot = f; // solo 'left' | 'right' | 'both'
    } else {
      // se l'input non è valido NON settiamo nulla qui: nessun foot nel patch
      delete patch.foot;
    }
  }

  return patch;
}

/* ================= GET /api/profiles/me ================= */

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
    user: { id: user.id, email: user.email },
    profile: data
      ? { ...data, account_type }
      : { user_id: user.id, account_type },
  });
});

/* ================= PATCH /api/profiles/me ================= */

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const patch = pickPatch(body);

  // leggi eventuale profilo esistente
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError && readError.code !== 'PGRST116') {
    return jsonError(readError.message, 500);
  }

  const existingRow = (existing as ProfileRow | null) ?? null;

  const account_type: AccountType =
    normalizeAccountType(body.account_type) ??
    normalizeAccountType(existingRow?.account_type) ??
    normalizeAccountType(user.user_metadata?.account_type) ??
    normalizeAccountType(user.user_metadata?.role) ??
    null;

  const row: any = {
    user_id: user.id,
    account_type,
  };

  // merge campo per campo solo se presente nel patch o già esistente
  const mergeField = <K extends keyof ProfileRow>(key: K) => {
    if (key in patch) {
      row[key] = (patch as any)[key];
    } else if (existingRow && existingRow[key] !== undefined) {
      row[key] = existingRow[key];
    }
  };

  mergeField('full_name');
  mergeField('bio');
  mergeField('avatar_url');
  mergeField('birth_year');
  mergeField('birth_place');
  mergeField('city');
  mergeField('country');
  mergeField('sport');
  mergeField('role');
  mergeField('height_cm');
  mergeField('weight_kg');
  mergeField('interest_country');
  mergeField('interest_region_id');
  mergeField('interest_province_id');
  mergeField('interest_municipality_id');
  mergeField('links');

  // notify_email_new_message: mai null → default true se non abbiamo nulla
  if ('notify_email_new_message' in patch) {
    row.notify_email_new_message =
      typeof patch.notify_email_new_message === 'boolean'
        ? patch.notify_email_new_message
        : true;
  } else if (
    existingRow &&
    typeof existingRow.notify_email_new_message === 'boolean'
  ) {
    row.notify_email_new_message =
      existingRow.notify_email_new_message;
  } else {
    row.notify_email_new_message = true;
  }

  // FOOT: solo se patch ha prodotto un valore valido; altrimenti:
  // - se esiste un valore esistente, lo manteniamo
  // - se non esiste, NON includiamo la colonna così il DB usa default
  if ('foot' in patch) {
    // pickPatch ha messo solo valori validi 'left' | 'right' | 'both'
    row.foot = patch.foot;
  } else if (existingRow && existingRow.foot) {
    row.foot = existingRow.foot;
  }
  // NOTA: nessun row.foot = null esplicito per evitare violazioni del check

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
      { error: error.message || 'profile_update_failed' },
      { status: 400 }
    );
  }

  const normalizedAccountType =
    normalizeAccountType(data?.account_type) ?? account_type;

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: { ...data, account_type: normalizedAccountType },
  });
});
