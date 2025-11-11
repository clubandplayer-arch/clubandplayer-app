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
  // comuni
  'account_type',
  'type', // alias in input
  'full_name',
  'display_name',
  'avatar_url',
  'bio',
  'country',
  'city',

  // atleta
  'birth_year',
  'birth_place',
  'birth_country',
  'foot',
  'height_cm',
  'weight_kg',
  'sport',
  'role',
  'visibility',

  // interessi geo
  'interest_country',
  'interest_region_id',
  'interest_province_id',
  'interest_municipality_id',

  // social
  'links',

  // notifiche
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
    console.error('[profiles/me] select error', error);
    return NextResponse.json(
      { error: 'profile_fetch_failed' },
      { status: 500 }
    );
  }

  if (!data) {
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

  const body = await req.json().catch(() => ({} as any));
  const patch = pickPatch(body);

  // account_type safe
  if (patch.account_type) {
    const t = String(patch.account_type).toLowerCase();
    if (t.includes('club')) patch.account_type = 'club';
    else if (t.includes('athlete') || t.includes('atlet'))
      patch.account_type = 'athlete';
    else delete patch.account_type;
  }

  // links → oggetto json pulito o null
  if (patch.links && typeof patch.links === 'object') {
    const safeLinks: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(patch.links as any)) {
      if (typeof v === 'string' && v.trim()) {
        safeLinks[k] = v.trim();
      } else if (v == null || v === '') {
        safeLinks[k] = null;
      }
    }
    patch.links =
      Object.keys(safeLinks).length > 0 ? safeLinks : null;
  }

  // numerici
  const numericKeys = [
    'birth_year',
    'height_cm',
    'weight_kg',
    'club_foundation_year',
  ];
  for (const key of numericKeys) {
    if (key in patch) {
      const v = (patch as any)[key];
      if (v === '' || v == null) {
        (patch as any)[key] = null;
      } else if (typeof v === 'string') {
        const n = Number(v);
        (patch as any)[key] = Number.isFinite(n) ? n : null;
      }
    }
  }

  const now = new Date().toISOString();

  const upsertPayload = {
    id: user.id,
    user_id: user.id,
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
      {
        error: 'profile_update_failed',
        details: error.message,
      },
      { status: 400 }
    );
  }

  const account_type = normalizeAccountType(data);
  const normalized = { ...data, account_type };

  return NextResponse.json({ data: normalized });
}
