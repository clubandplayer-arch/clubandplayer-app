import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/api/rateLimit';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return createClient(url, anon);
}

const SELECT =
  'id,title,description,owner_id,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name';

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req as any, { key: 'opps:GET', limit: 60, window: '1m' } as any);

    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q')?.trim();
    const sport = searchParams.get('sport')?.trim();
    const role = searchParams.get('role')?.trim();
    const country = searchParams.get('country')?.trim();
    const region = searchParams.get('region')?.trim();
    const province = searchParams.get('province')?.trim();
    const city = searchParams.get('city')?.trim();
    const sort = (searchParams.get('sort') || 'latest').toLowerCase(); // latest | oldest
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    let query = getSupabase()
      .from('opportunities')
      .select(SELECT, { count: 'exact' });

    if (q) {
      // match su titolo o descrizione
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (sport) query = query.eq('sport', sport);
    if (role) query = query.eq('role', role);
    if (country) query = query.eq('country', country);
    if (region) query = query.eq('region', region);
    if (province) query = query.eq('province', province);
    if (city) query = query.eq('city', city);

    query = query.order('created_at', { ascending: sort === 'oldest' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (error) return jsonError(error.message, 400);

    return NextResponse.json({
      data: data ?? [],
      meta: {
        total: count ?? 0,
        page,
        pageSize,
        totalPages: count ? Math.max(1, Math.ceil(count / pageSize)) : 1,
        sort,
      },
    });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
