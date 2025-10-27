// app/api/opportunities/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeToEN, PLAYING_CATEGORY_EN } from '@/lib/enums';

export const runtime = 'nodejs';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function bracketToRange(code?: string): { age_min: number | null; age_max: number | null } {
  switch ((code || '').trim()) {
    case '17-20': return { age_min: 17, age_max: 20 };
    case '21-25': return { age_min: 21, age_max: 25 };
    case '26-30': return { age_min: 26, age_max: 30 };
    case '31+':   return { age_min: 31, age_max: null };
    default:      return { age_min: null, age_max: null };
  }
}

// Pulisce qualsiasi input in stringa o null (evita [object Object])
function norm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s && s !== '[object Object]' ? s : null;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.value === 'string' && any.value) ||
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

/** GET /api/opportunities — pubblico */
export async function GET(req: NextRequest) {
  try {
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

  const country = (url.searchParams.get('country') || '').trim();
  const region = (url.searchParams.get('region') || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const sport = (url.searchParams.get('sport') || '').trim();
  const role = (url.searchParams.get('role') || '').trim();
  const ageB = (url.searchParams.get('age') || '').trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('opportunities')
    .select(
      'id,title,description,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name',
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

  const { data, count, error } = await query;
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({
    data: data ?? [],
    q,
    page,
    pageSize,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    sort,
  });
}

/** POST /api/opportunities — deve essere club; Calcio richiede required_category (EN) */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // verifica club
  const metaRole = String(user.user_metadata?.role ?? '').toLowerCase();
  let isClub = metaRole === 'club';
  if (!isClub) {
    const tryBy = async (col: 'id' | 'user_id') => {
      const { data } = await supabase.from('profiles').select('account_type').eq(col, user.id).maybeSingle();
      return data?.account_type as string | null | undefined;
    };
    const acct = (await tryBy('id')) ?? (await tryBy('user_id'));
    isClub = String(acct ?? '').toLowerCase() === 'club';
  }
  if (!isClub) return jsonError('forbidden_not_club', 403);

  const body = await req.json().catch(() => ({}));
  const title = norm((body as any).title);
  if (!title) return jsonError('Title is required', 400);

  const description = norm((body as any).description);
  const country = norm((body as any).country);
  const region = norm((body as any).region);
  const province = norm((body as any).province);
  const city = norm((body as any).city);
  const sport = norm((body as any).sport);
  const roleHuman = norm((body as any).role) ?? norm((body as any).roleLabel) ?? norm((body as any).roleValue);
  const club_name = norm((body as any).club_name);
  const { age_min, age_max } = bracketToRange((body as any).age_bracket);

  // required_category (solo Calcio) → EN per enum playing_role
  let required_category: string | null = null;
  if (sport === 'Calcio') {
    const candidate =
      norm((body as any).required_category) ??
      norm((body as any).requiredCategory) ??
      norm((body as any).playing_category) ??
      norm((body as any).playingCategory) ??
      roleHuman;

    const en = candidate ? normalizeToEN(candidate) : null;
    if (!en) {
      return NextResponse.json(
        { error: 'invalid_required_category', allowed_en: PLAYING_CATEGORY_EN },
        { status: 400 }
      );
    }
    required_category = en; // 👈 EN per il nuovo enum playing_role
  }

  const insertPayload: Record<string, unknown> = {
    title,
    description,
    created_by: user.id,
    country,
    region,
    province,
    city,
    sport,
    role: roleHuman,
    required_category,
    age_min,
    age_max,
    club_name,
  };

  const { data, error } = await supabase
    .from('opportunities')
    .insert(insertPayload)
    .select('id,title,description,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
