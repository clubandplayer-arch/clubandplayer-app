import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/profiles/me  (profilo dell’utente loggato) */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try { await rateLimit(_req, { key: 'profiles:ME', limit: 60, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? null });
});

/** PATCH /api/profiles/me  (update by user_id) */
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'profiles:ME:PATCH', limit: 40, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const body = (await req.json()) as Record<string, any>;

  // Whitelist dei campi aggiornabili
  const allowed = new Set([
    'display_name', 'bio', 'height_cm', 'weight_kg', 'foot', 'sport', 'role', 'visibility',
    'interest_country', 'interest_region_id', 'interest_province_id', 'interest_municipality_id',
    'interest_region', 'interest_province', 'interest_city', // se arrivano stringhe dal vecchio form
  ]);

  const update: Record<string, any> = {};
  for (const k of Object.keys(body)) {
    if (allowed.has(k)) update[k] = body[k];
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('user_id', user.id)
    .select()
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
