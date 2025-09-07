import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';
const ALLOWED = new Set(['submitted', 'seen', 'accepted', 'rejected']);

/** PATCH /api/applications/:id  { status }  */
export const PATCH = withAuth(async (req: NextRequest, { supabase }) => {
  try { await rateLimit(req, { key: 'applications:PATCH', limit: 60, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({} as any));
  const status = String(body.status ?? '').trim();
  if (!ALLOWED.has(status)) return jsonError('Invalid status', 400);

  // RLS fa rispettare che solo l'owner dell'opportunità possa aggiornare
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
