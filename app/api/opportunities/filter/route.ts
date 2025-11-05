// app/api/opportunities/filter/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
// import { rateLimit } from '@/lib/api/rateLimit'; // se presente, scommenta e usa

type Gender = 'male' | 'female' | 'mixed';
type Maybe<T> = T | null | undefined;

function norm(v: Maybe<string>) {
  const s = (v ?? '').trim();
  return s && s !== '[object Object]' ? s : '';
}

/** Applica ai query builder i filtri correnti */
function applyCommonFilters(query: any, p: URLSearchParams) {
  const q = norm(p.get('q'));
  const region = norm(p.get('region'));
  const province = norm(p.get('province'));
  const city = norm(p.get('city'));
  const role = norm(p.get('role'));
  const gender = norm(p.get('gender')).toLowerCase() as Gender | '';

  if (region) query = query.eq('region', region);
  if (province) query = query.eq('province', province);
  if (city) query = query.eq('city', city);
  if (role) query = query.eq('role', role);
  if (gender && (gender === 'male' || gender === 'female' || gender === 'mixed')) {
    query = query.eq('gender', gender);
  }

  if (q) {
    const like = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    query = query.or(
      [
        `title.ilike.${like}`,
        `description.ilike.${like}`,
        `club_name.ilike.${like}`,
        `city.ilike.${like}`,
        `region.ilike.${like}`,
        `province.ilike.${like}`,
        `sport.ilike.${like}`,
        `role.ilike.${like}`,
      ].join(',')
    );
  }
  return query;
}

/** Estrae valori unici di una colonna applicando i filtri comuni */
async function uniqValues(supabase: any, column: string, params: URLSearchParams) {
  let q = supabase
    .from('opportunities')
    .select(column)
    .neq(column, null)
    .order(column, { ascending: true })
    .range(0, 999); // limite ragionevole per facets

  q = applyCommonFilters(q, params);

  const { data, error } = await q;
  if (error) throw error;

  const set = new Set<string>();
  for (const row of data ?? []) {
    const v = String((row as any)[column] ?? '').trim();
    if (v) set.add(v);
  }
  return Array.from(set);
}

export async function GET(req: NextRequest) {
  try {
    // await rateLimit(req, { key: 'opps:FILTER', limit: 60, window: '1m' });

    const supabase = await getSupabaseServerClient();
    const params = new URL(req.url).searchParams;

    // facets in parallelo
    const [regions, provinces, cities, roles, genders] = await Promise.all([
      uniqValues(supabase, 'region', params),
      uniqValues(supabase, 'province', params),
      uniqValues(supabase, 'city', params),
      uniqValues(supabase, 'role', params),
      uniqValues(supabase, 'gender', params),
    ]);

    // total coerente ai filtri correnti
    let countQ = supabase.from('opportunities').select('id', { count: 'exact', head: true });
    countQ = applyCommonFilters(countQ, params);
    const { count, error: cErr } = await countQ;
    if (cErr) throw cErr;

    return NextResponse.json({
      filters: { regions, provinces, cities, roles, genders },
      total: count ?? 0,
    });
  } catch (e: any) {
    console.error('[opportunities:filter]', e);
    return NextResponse.json({ error: 'internal_error', details: String(e?.message ?? e) }, { status: 500 });
  }
}
