// app/api/clubs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { listParamsSchema } from '@/lib/api/schemas';
import { rateLimit } from '@/lib/api/rateLimit';

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
    .select('id,name,display_name,city,country,level,logo_url,owner_id,created_at', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
  }

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

/** POST /api/clubs  { name, display_name?, city?, country?, level?, logo_url? } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'clubs:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  const display_name = (body.display_name ?? '').trim() || name;
  const city = (body.city ?? '').trim() || null;
  const country = (body.country ?? '').trim() || null;
  const level = (body.level ?? '').trim() || null;
  const logo_url = (body.logo_url ?? '').trim() || null;

  if (!name) return jsonError('Name is required', 400);

  // RLS: with_check (owner_id = auth.uid())
  const { data, error } = await supabase
    .from('clubs')
    .insert({ name, display_name, city, country, level, logo_url, owner_id: user.id })
    .select('id,name,display_name,city,country,level,logo_url,owner_id,created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
