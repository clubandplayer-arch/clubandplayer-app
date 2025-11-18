// app/api/clubs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { listParamsSchema } from '@/lib/api/schemas';
import { rateLimit } from '@/lib/api/rateLimit';
import { isClubsAdminUser } from '@/lib/api/admin'; // 👈 admin guard

export const runtime = 'nodejs'; // sessione/cookie

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** GET /api/clubs?q=&page=&pageSize=  |  oppure  ?limit=&offset= */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  try {
    await rateLimit(req, { key: 'clubs:GET', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const region = (url.searchParams.get('region') || '').trim();
  const country = (url.searchParams.get('country') || '').trim();

  // page/pageSize (nuovo) o limit/offset (legacy)
  const pageParam = Number(url.searchParams.get('page'));
  const pageSizeParam = Number(url.searchParams.get('pageSize'));

  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listParamsSchema.safeParse(raw);
  const limitRaw = parsed.success ? (parsed.data as any).limit : undefined;
  const offsetRaw = parsed.success ? (parsed.data as any).offset : undefined;

  let limit: number;
  let offset: number;

  if (Number.isFinite(pageParam) && Number.isFinite(pageSizeParam) && pageParam >= 1) {
    const page = Math.max(1, pageParam);
    const pageSize = clamp(pageSizeParam, 1, 50);
    limit = pageSize;
    offset = (page - 1) * pageSize;
  } else {
    limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 50;
    offset = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 0;
    limit = clamp(limit, 1, 200);
    offset = Math.max(0, offset);
  }

  const from = offset;
  const to = offset + limit - 1;

  let query = supabase
    .from('clubs')
    .select('id,name,display_name,city,province,region,country,level,logo_url,bio,owner_id,created_at', { count: 'exact' })
    // l'ordinamento discendente sfrutta l'indice idx_clubs_created_at
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    const sanitized = q.replace(/,/g, ' ');
    const like = `%${sanitized}%`;
    // usa pg_trgm sugli ilike per ricerche fuzzy su nome/display_name/città
    query = query.or(`name.ilike.${like},display_name.ilike.${like},city.ilike.${like}`);
  }

  if (city) query = query.ilike('city', `%${city}%`);
  if (province) query = query.ilike('province', `%${province}%`);
  if (region) query = query.ilike('region', `%${region}%`);
  if (country) query = query.ilike('country', `%${country}%`);

  const { data, count, error } = await query;
  if (error) return jsonError(error.message, 400);

  const total = count ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const pageSize = limit;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    data: data ?? [],
    q,
    total,
    page,
    pageSize,
    pageCount,
    pagination: { limit: pageSize, offset },
  });
});

/** POST /api/clubs  { name, display_name?, city?, country?, level?, logo_url? }  (ADMIN ONLY) */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'clubs:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // 👇 Admin only
  const isAdmin = await isClubsAdminUser(supabase, user);
  if (!isAdmin) return jsonError('forbidden_admin_only', 403);

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  const display_name = (body.display_name ?? '').trim() || name;
  const city = (body.city ?? '').trim() || null;
  const country = (body.country ?? '').trim() || null;
  const level = (body.level ?? '').trim() || null;
  const logo_url = (body.logo_url ?? '').trim() || null;

  if (!name) return jsonError('Name is required', 400);

  const { data, error } = await supabase
    .from('clubs')
    .insert({ name, display_name, city, country, level, logo_url, owner_id: user.id })
    .select('id,name,display_name,city,country,level,logo_url,owner_id,created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
