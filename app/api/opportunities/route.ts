// app/api/opportunities/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeToEN, normalizeToIT, PLAYING_CATEGORY_EN, PLAYING_CATEGORY_IT } from '@/lib/enums';

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
// Normalizza qualsiasi input in stringa pulita (o null)
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

/** GET /api/opportunities  — pubblico */
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

  // Filtri
  const country = (url.searchParams.get('country') || '').trim();
  const region = (url.searchParams.get('region') || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const sport = (url.searchParams.get('sport') || '').trim();
  const role = (url.searchParams.get('role') || '').trim();
  const ageB = (url.searchParams.get('age') || '').trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supa = supabase
    .from('opportunities')
    .select(
      'id,title,description,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name',
      { count: 'exact' }
    )
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);

  let query = supa;
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

/** POST /api/opportunities — club + normalizzazione ruolo con retry EN→IT */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // Verifica club
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

  // Body & validazioni
  const body = await req.json().catch(() => ({}));
  const title = norm((body as any).title);
  if (!title) return jsonError('Title is required', 400);

  const description = norm((body as any).description);
  const country = norm((body as any).country);
  const region = norm((body as any).region);
  const province = norm((body as any).province);
  const city = norm((body as any).city);
  const sport = norm((body as any).sport);
  const roleHuman =
    norm((body as any).role) ??
    norm((body as any).roleLabel) ??
    norm((body as any).roleValue);
  const club_name = norm((body as any).club_name);
  const { age_min, age_max } = bracketToRange((body as any).age_bracket);

  // Candidato per required_category (se Calcio)
  const requiredCandidate =
    norm((body as any).required_category) ??
    norm((body as any).requiredCategory) ??
    norm((body as any).playing_category) ??
    norm((body as any).playingCategory) ??
    roleHuman;

  const basePayload = {
    title,
    description,
    created_by: user.id,
    country,
    region,
    province,
    city,
    sport,
    role: roleHuman, // stringa descrittiva per UI
    age_min,
    age_max,
    club_name,
  };

  const doInsert = async (required_category?: string) => {
    const payload = { ...basePayload, ...(required_category ? { required_category } : {}) };
    return supabase
      .from('opportunities')
      .insert(payload)
      .select(
        'id,title,description,created_by,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name'
      )
      .single();
  };

  // Se non è Calcio, inserisci senza enum (o eventuale valore libero di role)
  if (sport !== 'Calcio') {
    const { data, error } = await doInsert(undefined);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data }, { status: 201 });
  }

  // Calcio: obbligatorio required_category → prova EN, fallback IT
  const normEN = requiredCandidate ? normalizeToEN(requiredCandidate) : null;
  const normIT = requiredCandidate ? normalizeToIT(requiredCandidate) : null;

  if (!normEN && !normIT) {
    return NextResponse.json(
      { error: 'invalid_required_category', allowed_en: PLAYING_CATEGORY_EN, allowed_it: PLAYING_CATEGORY_IT },
      { status: 400 }
    );
  }

  // 1° tentativo EN
  let { data, error } = await doInsert(normEN ?? undefined);
  if (!error) return NextResponse.json({ data }, { status: 201 });

  // Se Postgres rifiuta l'enum (come nel tuo screenshot), riprova IT
  if (/invalid input value for enum .*playing_category/i.test(error.message)) {
    const retry = await doInsert(normIT ?? undefined);
    if (!retry.error) return NextResponse.json({ data: retry.data }, { status: 201 });

    return NextResponse.json(
      { error: 'invalid_required_category', allowed_en: PLAYING_CATEGORY_EN, allowed_it: PLAYING_CATEGORY_IT },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: error.message }, { status: 400 });
});
