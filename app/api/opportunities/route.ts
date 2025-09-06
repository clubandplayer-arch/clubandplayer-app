// app/api/opportunities/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// GET /api/opportunities?q=&page=&pageSize=&sort=recent|oldest
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  try {
    await rateLimit(req, { key: 'opps:GET', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = clamp(Number(url.searchParams.get('pageSize') || '20'), 1, 100);
  const sort = (url.searchParams.get('sort') || 'recent') as 'recent' | 'oldest';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('opportunities')
    .select('id,title,description,created_by,created_at', { count: 'exact' })
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) return jsonError(error.message, 400);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    data: data ?? [],
    q,
    page,
    pageSize,
    total,
    pageCount,
    sort,
  });
});

// POST /api/opportunities  { title, description? }
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? '').trim();
  const description = (body.description ?? '').trim();

  if (!title) return jsonError('Title is required', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .insert({ title, description: description || null, created_by: user.id })
    .select('id,title,description,created_by,created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
