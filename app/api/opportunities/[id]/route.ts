// app/api/opportunities/[id]/applications/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/opportunities/:id/applications  (solo owner) */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, {
      key: 'applications:LIST',
      limit: 120,
      window: '1m',
    } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const segments = req.nextUrl.pathname.split('/');
  const opportunityId = segments[segments.length - 2];

  if (!opportunityId) {
    return jsonError('Missing opportunity id', 400);
  }

  // Verifica proprietà opportunità (owner_id + fallback created_by)
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('owner_id, created_by')
    .eq('id', opportunityId)
    .maybeSingle();

  if (oppErr || !opp) {
    return jsonError('Opportunity not found', 404);
  }

  const ownerId =
    (opp as any).owner_id ??
    (opp as any).created_by ??
    null;

  if (!ownerId || ownerId !== user.id) {
    return jsonError('Forbidden', 403);
  }

  // Candidature per l’opportunità
  const { data: rows, error: appsErr } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, note, status, created_at, updated_at')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false });

  if (appsErr) {
    return jsonError(appsErr.message, 400);
  }

  const apps = rows ?? [];
  const athleteIds = Array.from(
    new Set(apps.map((a) => a.athlete_id).filter(Boolean)),
  );

  // Profili atleti
  const profilesMap = new Map<
    string,
    { id: string; display_name: string | null; account_type: string | null }
  >();

  if (athleteIds.length) {
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, display_name, account_type, profile_type, type')
      .in('user_id', athleteIds);

    if (!profErr && profs) {
      for (const p of profs) {
        const raw = (
          p.account_type ??
          p.profile_type ??
          p.type ??
          ''
        )
          .toString()
          .toLowerCase();

        const accountType =
          raw.startsWith('club')
            ? 'club'
            : raw.startsWith('athlet')
            ? 'athlete'
            : null;

        profilesMap.set(p.user_id, {
          id: p.user_id,
          display_name: p.display_name ?? null,
          account_type: accountType,
        });
      }
    }
  }

  const data = apps.map((app) => {
    const athlete =
      app.athlete_id != null
        ? profilesMap.get(app.athlete_id) ?? null
        : null;
    return { ...app, athlete };
  });

  return NextResponse.json({ data });
});
