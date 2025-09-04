export const runtime = 'nodejs';

// app/api/opportunities/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { listParamsSchema, opportunityCreateSchema } from '@/lib/api/schemas';
import { rateLimit } from '@/lib/api/rateLimit';

/** GET /api/opportunities?limit=...&offset=... */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `opps:GET:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listParamsSchema.safeParse(raw);

  const limitRaw = parsed.success ? (parsed.data as any).limit : undefined;
  const offsetRaw = parsed.success ? (parsed.data as any).offset : undefined;

  let limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 50;
  let offset = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 0;
  if (limit < 1) limit = 1;
  if (limit > 200) limit = 200;
  if (offset < 0) offset = 0;

  const sel = supabase
    .from('opportunities')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const { data, error, count } = await sel.range(offset, offset + limit - 1);

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data, pagination: { limit, offset, count: count ?? null } });
});

/** POST /api/opportunities  { title, description? }  (solo club) */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `opps:POST:${user.id}`, limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // (facoltativo) blocca i non-club lato API — se non vuoi controllare qui, rimuovi questo blocco e demanda alla RLS
  const role = (user.user_metadata as any)?.role;
  if (role !== 'club') return jsonError('Forbidden (role required: club)', 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  const parsed = opportunityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map(i => i.message).join('; '), 400);
  }

  const { title, description } = parsed.data;

  // ⚠️ Cambia 'owner_id' se la tua tabella usa 'club_id' o 'created_by'
  const row: any = {
    title,
    description: description ?? '',
    owner_id: user.id, // 👈 se necessario rinomina QUI
  };

  const { data, error } = await supabase
    .from('opportunities')
    .insert(row)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
