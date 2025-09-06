import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }
function bracketToRange(code?: string): { age_min: number | null; age_max: number | null } {
  switch ((code || '').trim()) {
    case '17-20': return { age_min: 17, age_max: 20 };
    case '21-25': return { age_min: 21, age_max: 25 };
    case '26-30': return { age_min: 26, age_max: 30 };
    case '31+':   return { age_min: 31, age_max: null };
    default:      return { age_min: null, age_max: null };
  }
}

export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  try { await rateLimit(req, { key: 'opps:GET', limit: 60, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }

  const url = new URL(req.url);
  const q        = (url.searchParams.get('q') || '').trim();
  const page     = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = clamp(Number(url.searchParams.get('pageSize') || '20'), 1, 100);
  const sort     = (url.searchParams.get('sort') || 'recent') as 'recent' | 'oldest';

  // Filtri
  const country  = (url.searchParams.get('country')  || '').trim();
  const region   = (url.searchParams.get('region')   || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const city     = (url.searchParams.get('city')     || '').trim();
  const sport    = (url.searchParams.get('sport')    || '').trim();
  const role     = (url.searchParams.get('role')     || '').trim();
  const ageB     = (url.searchParams.get('age')      || '').trim();

  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase
    .from('opportunities')
    .select('id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name', { count: 'exact' })
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,region.ilike.%${q}%,province.ilike.%${q}%,country.ilike.%${q}%,sport.ilike.%${q}%,role.ilike.%${q}%`);
  if (country)  query = query.eq('country', country);
  if (region)   query = query.eq('region', region);
  if (province) query = query.eq('province', province);
  if (city)     query = query.eq('city', city);
  if (sport)    query = query.eq('sport', sport);
  if (role)     query = query.eq('role', role);
  if (ageB) {
    const { age_min, age_max } = bracketToRange(ageB);
    if (age_min != null) query = query.gte('age_min', age_min);
    if (age_max != null) query = query.lte('age_max', age_max);
    if (age_max == null) query = query.is('age_max', null);
  }

  const { data, count, error } = await query;
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({
    data: data ?? [],
    q, page, pageSize, total: count ?? 0, pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)), sort,
  });
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? '').trim();
  if (!title) return jsonError('Title is required', 400);

  const description = (body.description ?? '').trim() || null;
  const country  = (body.country  ?? '').trim() || null;
  const region   = (body.region   ?? '').trim() || null;
  const province = (body.province ?? '').trim() || null;
  const city     = (body.city     ?? '').trim() || null;
  const sport    = (body.sport    ?? '').trim() || null;
  const role     = (body.role     ?? '').trim() || null;
  const club_name= (body.club_name?? '').trim() || null;

  const { age_min, age_max } = bracketToRange(body.age_bracket);

  // Regola di validazione richiesta: se Sport = Calcio, ruolo obbligatorio
  if (sport === 'Calcio' && !role) return jsonError('Role is required for Calcio', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .insert({ title, description, created_by: user.id, country, region, province, city, sport, role, age_min, age_max, club_name })
    .select('id,title,description,created_by,created_at,country,region,province,city,sport,role,age_min,age_max,club_name')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
