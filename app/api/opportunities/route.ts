import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const SELECT =
      'id,title,description,owner_id,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name';

    // base query con count esatto per la paginazione
    let qb = supabase
      .from('opportunities')
      .select(SELECT, { count: 'exact' })
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
