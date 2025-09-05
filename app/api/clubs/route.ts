// app/api/clubs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { listParamsSchema } from '@/lib/api/schemas';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs'; // niente edge (serve accesso cookie/supabase)

/** GET /api/clubs?limit=...&offset=... */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  // Rate-limit di base
  try {
    await rateLimit(req, { key: 'clubs:GET', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // Parametri query → oggetto semplice
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listParamsSchema.safeParse(raw);

  // Normalizza i numeri evitando union types fastidiosi
  const limitRaw = parsed.success ? (parsed.data as any).limit : undefined;
  const offsetRaw = parsed.success ? (parsed.data as any).offset : undefined;

  let limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 50;
  let offset = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 0;
  if (limit < 1) limit = 1;
  if (limit > 200) limit = 200;
  if (offset < 0) offset = 0;

  // Query RLS con sessione utente
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .range(offset, offset + limit - 1);

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data, pagination: { limit, offset } });
});
