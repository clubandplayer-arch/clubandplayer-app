import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/profiles/:id
 *  Compatibile: prova prima per profiles.id, se non c'è usa user_id
 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  try { await rateLimit(req, { key: 'profiles:GET', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  // Tenta per PK id
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  // Se non trovato, prova per user_id (retrocompatibilità)
  if (!data && !error) {
    const alt = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    data = alt.data as any;
    error = alt.error as any;
  }

  if (error) return jsonError(error.message, 400);
  if (!data) return jsonError('Not found', 404);
  return NextResponse.json({ data });
});

/** PATCH /api/profiles/:id
 *  Aggiorna per id se esiste, altrimenti per user_id (compat).
 */
export const PATCH = withAuth(async (req: NextRequest, { supabase }) => {
  try { await rateLimit(req, { key: 'profiles:PATCH', limit: 60, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = (await req.json()) as Record<string, any>;
  const allowed = new Set([
    'display_name', 'bio', 'height_cm', 'weight_kg', 'foot', 'sport', 'role', 'visibility',
    'interest_country', 'interest_region_id', 'interest_province_id', 'interest_municipality_id',
    'interest_region', 'interest_province', 'interest_city',
  ]);
  const update: Record<string, any> = {};
  for (const k of Object.keys(body)) {
    if (allowed.has(k)) update[k] = body[k];
  }

  // Decidi colonna match: preferisci PK id se il record esiste
  const probe = await supabase.from('profiles').select('id').eq('id', id).maybeSingle();
  const matchCol = probe.data ? 'id' : 'user_id';

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq(matchCol, id)
    .select()
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!data) return jsonError('Not found', 404);
  return NextResponse.json({ data });
});
