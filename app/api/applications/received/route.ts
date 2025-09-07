import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/received  → candidature per le opportunità create dall’utente corrente */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:RECEIVED', limit: 120, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  // 1) Opportunità dell’owner
  const { data: opps, error: e1 } = await supabase
    .from('opportunities')
    .select('id, title, city, province, region, country')
    .eq('created_by', user.id);
  if (e1) return jsonError(e1.message, 400);

  if (!opps?.length) return NextResponse.json({ data: [] });

  const oppIds = opps.map(o => o.id);
  const oppMap = new Map(opps.map(o => [o.id, o]));

  // 2) Candidature su quelle opportunità
  const { data: rows, error: e2 } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .in('opportunity_id', oppIds)
    .order('created_at', { ascending: false });
  if (e2) return jsonError(e2.message, 400);

  const apps = rows ?? [];
  if (!apps.length) return NextResponse.json({ data: [] });

  // 3) Profili atleti
  const athleteIds = Array.from(new Set(apps.map(a => a.athlete_id)));
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name, profile_type')
    .in('id', athleteIds);

  const profMap = new Map((profs ?? []).map(p => [p.id, p]));

  // 4) Arricchisci
  const enhanced = apps.map(a => ({
    ...a,
    opportunity: oppMap.get(a.opportunity_id) ?? null,
    athlete: profMap.get(a.athlete_id) ?? null,
  }));

  return NextResponse.json({ data: enhanced });
});
