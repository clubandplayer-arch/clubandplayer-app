// app/api/applications/received/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/applications/received  → candidature per le opportunità create dall’utente corrente */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:RECEIVED', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  // 1) Opportunità dell’owner (compat: owner_id || created_by)
  const { data: opps, error: e1 } = await supabase
    .from('opportunities')
    .select('id, title, city, province, region, country, owner_id, created_by')
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);
  if (e1) return jsonError(e1.message, 400);

  if (!opps?.length) return NextResponse.json({ data: [] });

  const oppIds = opps.map((o) => o.id);
  const oppMap = new Map(opps.map((o) => [o.id, o]));

  // 2) Candidature su quelle opportunità
  const { data: rows, error: e2 } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .in('opportunity_id', oppIds)
    .order('created_at', { ascending: false });
  if (e2) return jsonError(e2.message, 400);

  const apps = rows ?? [];
  if (!apps.length) return NextResponse.json({ data: [] });

  // 3) Profili atleti (compat: profiles.id || profiles.user_id)
  const athleteIds = Array.from(new Set(apps.map((a) => a.athlete_id)));
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, profile_type')
    .or(`id.in.(${athleteIds.join(',')}),user_id.in.(${athleteIds.join(',')})`);

  // Mappa per id e user_id
  const profById = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
  const profByUser = new Map<string, any>((profs ?? []).map((p: any) => [p.user_id, p]));

  // 4) Arricchisci
  const enhanced = apps.map((a) => ({
    ...a,
    opportunity: oppMap.get(a.opportunity_id) ?? null,
    athlete: profById.get(a.athlete_id) ?? profByUser.get(a.athlete_id) ?? null,
  }));

  return NextResponse.json({ data: enhanced });
});
