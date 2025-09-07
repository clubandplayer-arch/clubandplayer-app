import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/opportunities/:id/applications  (owner only) */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:LIST', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return jsonError('Missing opportunity id', 400);

  // check owner
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('created_by')
    .eq('id', id)
    .single();
  if (oppErr) return jsonError(oppErr.message, 400);
  if (!opp || opp.created_by !== user.id) return jsonError('Forbidden', 403);

  const { data, error } = await supabase
    .from('applications')
    .select('id, athlete_id, note, status, created_at, updated_at')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
