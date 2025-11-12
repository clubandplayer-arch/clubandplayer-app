// app/api/opportunities/[id]/applications/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/opportunities/:id/applications  (owner only) */
export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:LIST', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return jsonError('Missing opportunity id', 400);

  // check owner (compat: owner_id || created_by)
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('owner_id, created_by')
    .eq('id', id)
    .single();
  if (oppErr) return jsonError(oppErr.message, 400);
<<<<<<< HEAD

  const owner = (opp as any)?.owner_id ?? (opp as any)?.created_by ?? null;
  if (!owner || owner !== user.id) return jsonError('Forbidden', 403);
=======
  const ownerId = (opp as any)?.owner_id ?? (opp as any)?.created_by;
  if (!opp || ownerId !== user.id) return jsonError('Forbidden', 403);
>>>>>>> codex/verify-repository-correctness

  // candidati
  const { data: rows, error } = await supabase
    .from('applications')
    .select('id, athlete_id, note, status, created_at, updated_at')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });
  if (error) return jsonError(error.message, 400);

  const apps = rows ?? [];
  const athleteIds = Array.from(new Set(apps.map((a) => a.athlete_id).filter(Boolean)));

<<<<<<< HEAD
  // profili atleti (compat)
  const profilesMap = new Map<string, any>();
  if (athleteIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, profile_type')
      .or(`id.in.(${athleteIds.join(',')}),user_id.in.(${athleteIds.join(',')})`);
    (profs ?? []).forEach((p: any) => {
      if (p.id) profilesMap.set(p.id, p);
      if (p.user_id) profilesMap.set(p.user_id, p);
=======
  // profili atleti
  const profilesMap = new Map<string, { id: string; display_name: string | null; account_type: string | null }>();
  if (athleteIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, account_type, profile_type, type')
      .in('id', athleteIds);
    profs?.forEach((p) => {
      profilesMap.set(p.id, {
        id: p.id,
        display_name: p.display_name,
        account_type: (p.account_type ?? p.profile_type ?? p.type ?? null) as string | null,
      });
>>>>>>> codex/verify-repository-correctness
    });
  }

  const enhanced = apps.map((a) => ({
    ...a,
    athlete: profilesMap.get(a.athlete_id) ?? null,
  }));

  return NextResponse.json({ data: enhanced });
});
