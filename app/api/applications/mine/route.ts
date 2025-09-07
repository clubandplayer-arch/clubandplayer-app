import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/mine?opportunityId=... */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:MINE', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const url = new URL(req.url);
  const oppId = url.searchParams.get('opportunityId') || null;

  let q = supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });

  if (oppId) q = q.eq('opportunity_id', oppId);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
