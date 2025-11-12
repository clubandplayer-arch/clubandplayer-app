import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

/** GET /api/opportunities/[id]/applications — visibile solo all’owner */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }: any) => {
  const id = _req.url.split('/opportunities/')[1]?.split('/')[0];
  if (!id) return jsonError('Missing id', 400);

  // verifica ownership
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', id)
    .single();
  if (oppErr) return jsonError(oppErr.message, 400);

  const ownerId = opp?.owner_id ?? opp?.created_by ?? null;
  if (!ownerId || ownerId !== user.id) return jsonError('Forbidden', 403);

  // candidati
  const { data: apps, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, athlete_id, created_at, message')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  // profili (minimi) per mapping
  const athleteIds = Array.from(new Set((apps ?? []).map(a => a.athlete_id).filter(Boolean)));
  const profilesMap = new Map<string, { id: string; display_name: string | null; account_type: string | null }>();
  if (athleteIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id,user_id,display_name,account_type,profile_type,type')
      .in('user_id', athleteIds);
    (profs ?? []).forEach((p: any) => {
      profilesMap.set(p.user_id, {
        id: p.user_id,
        display_name: p.display_name ?? null,
        account_type: (p.account_type ?? p.profile_type ?? p.type ?? null) as string | null,
      });
    });
  }

  const rows = (apps ?? []).map(a => ({
    id: a.id,
    created_at: a.created_at,
    message: a.message ?? null,
    athlete_id: a.athlete_id,
    athlete_profile: profilesMap.get(a.athlete_id) ?? null,
  }));

  return NextResponse.json({ data: rows });
});
