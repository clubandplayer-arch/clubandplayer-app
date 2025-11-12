// app/api/opportunities/filter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

<<<<<<< HEAD
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase environment variables are missing for opportunities filter API'
  );
=======
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are missing for opportunities filter API');
>>>>>>> codex/verify-repository-correctness
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function normalize(row: any) {
  const ownerId = row?.owner_id ?? row?.created_by ?? null;
  return { ...row, owner_id: ownerId, created_by: ownerId };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

<<<<<<< HEAD
  const sport = url.searchParams.get('sport')?.trim() || '';
  const page = Math.max(
    1,
    parseInt(url.searchParams.get('page') || '1', 10)
  );
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;
=======
    let q = supabase
      .from('opportunities')
      .select(
        'id,title,description,owner_id,created_at,country,region,province,city,sport,role,age_min,age_max,club_name',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);
>>>>>>> codex/verify-repository-correctness

  let q = supabase
    .from('opportunities')
    .select(
      'id,title,description,owner_id,created_at,country,region,province,city,sport,role,age_min,age_max,club_name',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

<<<<<<< HEAD
  if (sport) {
    q = q.eq('sport', sport);
=======
    const { data, error, count } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: (data ?? []).map(normalize),
      page,
      pageSize: limit,
      total: count ?? 0,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / limit)),
      sort: 'recent',
    });
  } catch (err: any) {
    console.error('[GET /api/opportunities/filter] error:', err?.message || err);
    return NextResponse.json(
      { error: 'internal_error', message: err?.message || String(err) },
      { status: 500 },
    );
>>>>>>> codex/verify-repository-correctness
  }

  const { data, error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []).map(normalize);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    data: rows,
    page,
    pageSize: limit,
    total,
    pageCount,
    sort: 'recent',
  });
}
