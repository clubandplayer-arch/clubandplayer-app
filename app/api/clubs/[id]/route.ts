// app/api/clubs/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function extractId(req: NextRequest): string | null {
  const pathname = new URL(req.url).pathname;
  const segs = pathname.split('/').filter(Boolean);
  return segs[segs.length - 1] ?? null;
}

export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const { data, error } = await supabase
    .from('clubs')
    .select('id,name,display_name,city,country,level,logo_url,owner_id,created_at')
    .eq('id', id)
    .single();

  if (error) return jsonError(error.message, 404);
  return NextResponse.json({ data });
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'clubs:PATCH', limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}) as any);

  const patch: Record<string, any> = {};
  for (const k of ['name', 'display_name', 'city', 'country', 'level', 'logo_url'] as const) {
    if (k in body) {
      const v = (body[k] ?? '').toString().trim();
      patch[k] = v || null;
    }
  }
  if (patch.name && !patch.display_name) patch.display_name = patch.name;

  const { data, error } = await supabase
    .from('clubs')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', user.id) // solo il proprietario
    .select('id,name,display_name,city,country,level,logo_url,owner_id,created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'clubs:DELETE', limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = extractId(req);
  if (!id) return jsonError('Missing id', 400);

  const { error } = await supabase.from('clubs').delete().eq('id', id).eq('owner_id', user.id);

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
