import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, withAuth } from '@/lib/api/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** Crea un client Supabase lato server (env di Vercel + local) */
function getSupabase() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return createClient(url, anon);
}

function intParam(sp: URLSearchParams, key: string, fallback: number, min = 1, max = 1000) {
  const raw = sp.get(key);
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

const SELECT_COLUMNS =
  'id,title,description,owner_id,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name';

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type ProfileRow = {
  account_type?: string | null;
  club_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // query params
    const q = (searchParams.get('q') ?? '').trim();
    const role = (searchParams.get('role') ?? '').trim();
    const status = (searchParams.get('status') ?? '').trim();
    const country = (searchParams.get('country') ?? '').trim();
    const city = (searchParams.get('city') ?? '').trim();
    const from = (searchParams.get('from') ?? '').trim(); // es. 2025-01-01
    const to = (searchParams.get('to') ?? '').trim();     // es. 2025-12-31

    const page = intParam(searchParams, 'page', 1, 1, 10_000);
    const limit = intParam(searchParams, 'limit', 20, 1, 100);
    const offset = (page - 1) * limit;
    const toIdx = offset + limit - 1;

    const supabase = getSupabase();

    // base query con count esatto per la paginazione
    let qb = supabase
      .from('opportunities')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false });

    // filtri esatti
    if (role) qb = qb.eq('role', role);
    if (status) qb = qb.eq('status', status);
    if (country) qb = qb.eq('country', country);
    if (city) qb = qb.ilike('city', `%${city}%`);

    // ricerca "q": match su più colonne (case-insensitive)
    if (q.length >= 2) {
      const like = `%${q}%`;
      qb = qb.or(
        [
          `title.ilike.${like}`,
          `description.ilike.${like}`,
          `city.ilike.${like}`,
          `province.ilike.${like}`,
          `region.ilike.${like}`,
          `club_name.ilike.${like}`,
        ].join(',')
      );
    }

    // range temporale
    if (from) qb = qb.gte('created_at', from);
    if (to) qb = qb.lte('created_at', to);

    // paginazione
    qb = qb.range(offset, toIdx);

    const { data, count, error } = await qb;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: data ?? [],
      meta: {
        total,
        page,
        pageSize: limit,   // <<< ora rispetta ?limit=10
        totalPages,
        sort: 'latest',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(async (req, { supabase, user }) => {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return jsonError('Payload non valido', 400);
    }

    const title = cleanText(body.title);
    if (!title) return jsonError('Titolo obbligatorio', 400);

    const description = cleanText(body.description);
    const country = cleanText(body.country);
    const region = cleanText(body.region);
    const province = cleanText(body.province);
    const city = cleanText(body.city);
    const sport = cleanText(body.sport);
    const role = cleanText(body.role);
    const requiredCategory = cleanText(body.required_category);

    const genderRaw = cleanText(body.gender);
    const allowedGenders = new Set(['male', 'female', 'mixed']);
    const gender = genderRaw && allowedGenders.has(genderRaw)
      ? (genderRaw as 'male' | 'female' | 'mixed')
      : null;
    if (!gender) return jsonError('Genere obbligatorio', 400);

    const ageBracket = cleanText(body.age_bracket);
    const rawAgeMin = body.age_min;
    const rawAgeMax = body.age_max;
    const ageMin = typeof rawAgeMin === 'number' && Number.isFinite(rawAgeMin)
      ? rawAgeMin
      : null;
    const ageMax = typeof rawAgeMax === 'number' && Number.isFinite(rawAgeMax)
      ? rawAgeMax
      : null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_type, display_name, full_name, club_name')
      .eq('id', user.id)
      .maybeSingle();

    let profileRow = (profile ?? null) as ProfileRow | null;
    if (profileError) {
      console.warn('[POST /api/opportunities] profile fetch denied, fallback admin', profileError);
      const admin = getSupabaseAdminClient();
      const { data: adminProfile, error: adminError } = await admin
        .from('profiles')
        .select('id, account_type, display_name, full_name, club_name')
        .eq('id', user.id)
        .maybeSingle();

      if (adminError) {
        console.error('[POST /api/opportunities] admin profile error', adminError);
        return jsonError('Impossibile verificare il profilo', 500);
      }

      profileRow = (adminProfile ?? null) as ProfileRow | null;
    }

    if (!profileRow || profileRow.account_type !== 'club') {
      return jsonError('Solo i club possono creare un’opportunità', 403);
    }

    const clubName =
      cleanText(profileRow.club_name) ??
      cleanText(profileRow.display_name) ??
      cleanText(profileRow.full_name);

    const payload = {
      title,
      description,
      country,
      region,
      province,
      city,
      sport,
      role,
      required_category: requiredCategory,
      gender,
      age_bracket: ageBracket,
      age_min: ageMin,
      age_max: ageMax,
      owner_id: user.id,
      created_by: user.id,
      club_name: clubName,
      status: cleanText(body.status) ?? 'open',
    };

    const { data, error } = await supabase
      .from('opportunities')
      .insert(payload)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      console.error('[POST /api/opportunities] insert error', error);
      return jsonError(error.message || 'Errore creazione opportunità', 500);
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[POST /api/opportunities] unexpected', err);
    return jsonError(err?.message || 'Unexpected error', 500);
  }
});
