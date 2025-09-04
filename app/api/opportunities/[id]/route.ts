// app/api/opportunities/[id]/route.ts
import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { opportunityUpdateSchema } from '@/lib/api/schemas';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

// id da params o, come fallback, dall'URL
function getId(req: Request, params?: Record<string, string | string[]>) {
  const p = params && typeof params.id === 'string' ? params.id : undefined;
  if (p) return p;
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1]!;
}

/** PUT /api/opportunities/:id */
export const PUT = withAuth(async ({ req, supabase, user, params }) => {
  try {
    await rateLimit(req, { key: `opps:PUT:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = getId(req, params);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  const parsed = opportunityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map(i => i.message).join('; '), 400);
  }

  const patch = parsed.data;
  if (!patch || Object.keys(patch).length === 0) {
    return jsonError('Nothing to update', 400);
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(patch as any)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});

/** DELETE /api/opportunities/:id */
export const DELETE = withAuth(async ({ req, supabase, user, params }) => {
  try {
    await rateLimit(req, { key: `opps:DEL:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = getId(req, params);

  const { data, error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
