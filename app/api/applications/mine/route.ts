import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/mine */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try { await rateLimit(_req, { key: 'applications:MINE', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  // filtro compatibile: athlete_id = user OR applicant_id = user
  const { data, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, applicant_id, note, status, created_at, updated_at')
    .or(`athlete_id.eq.${user.id},applicant_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  const normalized = (data ?? []).map((r: any) => ({
    id: r.id,
    opportunity_id: r.opportunity_id,
    athlete_id: r.athlete_id ?? r.applicant_id ?? null,
    note: r.note ?? null,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return NextResponse.json({ data: normalized });
});
