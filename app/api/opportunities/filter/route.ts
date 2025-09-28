export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sport = url.searchParams.get('sport')?.trim() || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = supabase
      .from('opportunities')
      .select(
        'id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (sport) q = q.eq('sport', sport);

    const { data, error, count } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: data ?? [],
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
      { status: 500 }
    );
  }
}
