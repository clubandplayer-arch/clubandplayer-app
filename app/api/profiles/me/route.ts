// app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AccountType = 'club' | 'athlete';

function normalizeAccountType(row: any | null): AccountType | null {
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

  // heuristics
  if (
    row.club_league_category ||
    row.club_foundation_year ||
    row.club_stadium
  ) {
    return 'club';
  }

  return 'athlete';
}

const ALLOWED_FIELDS = new Set([
  // common
  'account_type',
  'type', // legacy in input, verrà mappato
  'full_name',
  'display_name',
  'avatar_url',
  'bio',
  'country',

  // athlete
  'birth_year',
  'birth_place',
  'city',
  'birth_country',
  'birth_region_id',
  'birth_province_id',
  'birth_municipality_id',
  'residence_region_id',
  'residence_province_id',
  'residence_municipality_id',
  'foot',
  'height_cm',
  'weight_kg',
  'sport',
  'role',
  'visibility',

  // interests
  'interest_country',
  'interest_region_id',
  'interest_province_id',
  'interest_municipality_id',

  // social
  'links',

  // notifications
  'notify_email_new_message',

  // club
  'club_foundation_year',
  'club_stadium',
  'club_league_category',
]);

function pickPatch(body: any): Record<string, any> {
  if (!body || typeof body !== 'object') return {};
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    out[key] = value;
  }

  // normalizza account_type anche da "type"
  if (!out.account_type && typeof body.type === 'string') {
    const t = body.type.toLowerCase();
    if (t.includes('club')) out.account_type = 'club';
    else if (t.includes('athlete') || t.includes('atlet'))
      out.account_type = 'athlete';
  }

  if (typeof out.account_type === 'string') {
    const t = out.account_type.toLowerCase();
    if (t.includes('club')) out.account_type = 'club';
    else if (t.includes('athlete') || t.includes('atlet'))
      out.account_type = 'athlete';
    else delete out.account_type;
  }

  return out;
}

/* ---------------------------------- GET ---------------------------------- */

export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { user: null, data: null },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows on maybeSingle
    console.error('[profiles/me] select error', error);
    return NextResponse.json(
      { error: 'profile_fetch_failed' },
      { status: 500 }
    );
  }

  if (!data) {
    // utente loggato ma nessun profilo ancora creato
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      data: null,
    });
  }

  const account_type = normalizeAccountType(data);
  const normalized = { ...data, account_type };

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    data: normalized,
  });
}

/* --------------------------------- PATCH --------------------------------- */

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const patch = pickPatch(json);

  const now = new Date().toISOString();

  const upsertPayload = {
    id: user.id,
    user_id: user.id, // compat legacy
    ...patch,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    console.error('[profiles/me] upsert error', error);
    return NextResponse.json(
      { error: 'profile_update_failed' },
      { status: 400 }
    );
  }

  const account_type = normalizeAccountType(data);
  const normalized = { ...data, account_type };

  return NextResponse.json({ data: normalized });
}
