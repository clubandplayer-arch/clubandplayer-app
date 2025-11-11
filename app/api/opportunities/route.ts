// app/api/opportunities/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function bracketToRange(code?: string): { age_min: number | null; age_max: number | null } {
  switch ((code || '').trim()) {
    case '17-20':
      return { age_min: 17, age_max: 20 };
    case '21-25':
      return { age_min: 21, age_max: 25 };
    case '26-30':
      return { age_min: 26, age_max: 30 };
    case '31+':
      return { age_min: 31, age_max: null };
    default:
      return { age_min: null, age_max: null };
  }
}

// Normalizza qualsiasi input (stringa/oggetto/numero) in stringa pulita o null
function norm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s === '[object Object]') return null;
    return s;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.label === 'string' && any.label) ||
      (typeof any.nome === 'string' && any.nome) ||
      (typeof any.name === 'string' && any.name) ||
      (typeof any.description === 'string' && any.description) ||
      '';
    const out = String(s).trim();
    return out ? out : null;
  }
  return String(v).trim() || null;
}

function normalizeRow<T extends Record<string, any>>(row: T) {
  const ownerId = row.owner_id ?? row.created_by ?? null;
  return {
    ...row,
    owner_id: ownerId,
    created_by: ownerId,
  };
}

/** GET /api/opportunities  — pubblico (RLS consente SELECT anche anonima) */
export async function GET(req: NextRequest) {
  try {
    // rate limit anche per gli anonimi
    await rateLimit(req, { key: 'opps:GET', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const supabase = await getSupabaseServerClient();

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = clamp(Number(url.searchParams.get('pageSize') || '20'), 1, 100);
  const sort = (url.searchParams.get('sort') || 'recent') as 'recent' | 'oldest';

  // Filtri
  const country = (url.searchParams.get('country') || '').trim();
  const region = (url.searchParams.get('region') || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const sport = (url.searchParams.get('sport') || '').trim();
  const role = (url.searchParams.get('role') || '').trim();
  const ageB = (url.searchParams.get('age') || '').trim();
  const ownerFilter =
    (url.searchParams.get('owner') || '').trim() ||
    (url.searchParams.get('owner_id') || '').trim() ||
    (url.searchParams.get('created_by') || '').trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('opportunities')
    .select(
      'id,title,description,owner_id,created_at,country,region,province,city,sport,role,age_min,age_max,club_name',
      { count: 'exact' }
    )
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);

  if (q)
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,region.ilike.%${q}%,province.ilike.%${q}%,country.ilike.%${q}%,sport.ilike.%${q}%,role.ilike.%${q}%`
    );
  if (country && country !== '[object Object]') query = query.eq('country', country);
  if (region && region !== '[object Object]') query = query.eq('region', region);
  if (province && province !== '[object Object]') query = query.eq('province', province);
  if (city && city !== '[object Object]') query = query.eq('city', city);
  if (sport) query = query.eq('sport', sport);
  if (role) query = query.eq('role', role);
  if (ageB) {
    const { age_min, age_max } = bracketToRange(ageB);
    if (age_min != null) query = query.gte('age_min', age_min);
    if (age_max != null) query = query.lte('age_max', age_max);
    if (age_max == null) query = query.is('age_max', null);
  }
  if (ownerFilter) {
    query = query.eq('owner_id', ownerFilter);
  }

  const { data: initialData, count: initialCount, error } = await query;
  if (error) return jsonError(error.message, 400);

  let data = initialData ?? [];
  let totalCount = initialCount ?? 0;

  if (ownerFilter && data.length === 0) {
    const fallback = await supabase
      .from('opportunities')
      .select(
        'id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name',
        { count: 'exact' }
      )
      .eq('created_by', ownerFilter)
      .order('created_at', { ascending: sort === 'oldest' })
      .range(from, to);
    if (!fallback.error) {
      data = (fallback.data ?? []).map((row: any) => ({ ...row, owner_id: row.created_by }));
      totalCount = fallback.count ?? totalCount;
    }
  }

  return NextResponse.json({
    data: data.map((row) => normalizeRow(row as Record<string, any>)),
    q,
    page,
    pageSize,
    total: totalCount,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    sort,
  });
}

/** POST /api/opportunities — resta autenticato */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => ({}));
  const title = norm((body as any).title);
  if (!title) return jsonError('Title is required', 400);

  const description = norm((body as any).description);
  const country = norm((body as any).country);
  const region = norm((body as any).region);
  const province = norm((body as any).province);
  const city = norm((body as any).city);
  const sport = norm((body as any).sport);
  const role = norm((body as any).role);
  const club_name = norm((body as any).club_name);

  const { age_min, age_max } = bracketToRange((body as any).age_bracket);

  if (sport === 'Calcio' && !role) return jsonError('Role is required for Calcio', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title,
      description,
      owner_id: user.id,
      country,
      region,
      province,
      city,
      sport,
      role,
      age_min,
      age_max,
      club_name,
    })
    .select(
      'id,title,description,owner_id,created_at,country,region,province,city,sport,role,age_min,age_max,club_name'
    )
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: normalizeRow(data as Record<string, any>) }, { status: 201 });
});
