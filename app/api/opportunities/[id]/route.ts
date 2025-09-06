// app/api/opportunities/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function extractId(req: NextRequest): string | null {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 1] ?? null;
}

export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .select('id,title,description,created_by,created_at')
    .eq('id', id)
    .single();

  if (error) return jsonError(error.message, 404);
  return NextResponse.json({ data });
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:PATCH', limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, any> = {};
  if ('title' in body) patch.title = String(body.title || '').trim();
  if ('description' in body) patch.description = String(body.description || '').trim() || null;

  if (patch.title === '') return jsonError('Title is required', 400);

  const { data, error } = await supabase
    .from('opportunities')
    .update(patch)
    .eq('id', id)
    .eq('created_by', user.id) // owner only
    .select('id,title,description,created_by,created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:DELETE', limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
