import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/mine */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try { await rateLimit(_req, { key: 'applications:MINE', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const { data: rows, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return jsonError(error.message, 400);

  const apps = rows ?? [];
  const oppIds = Array.from(new Set(apps.map(a => a.opportunity_id)));

  // opportunità per arricchire titolo/luogo
  let oppMap = new Map<string, any>();
  if (oppIds.length) {
    const { data: opps } = await supabase
      .from('opportunities')
      .select('id, title, city, province, region, country, sport, role, created_at');
    opps?.forEach(o => oppMap.set(o.id, o));
  }

  const enhanced = apps.map(a => ({
    ...a,
    opportunity: oppMap.get(a.opportunity_id) ?? null,
  }));

  return NextResponse.json({ data: enhanced });
});
