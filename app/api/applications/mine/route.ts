import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/mine */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try { await rateLimit(_req, { key: 'applications:MINE', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const { data, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, note, status, created_at, updated_at')
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
