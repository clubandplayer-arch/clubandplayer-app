import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { projectOpportunityCanonicalContext } from '@/lib/opportunities/canonicalSportsContext.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const parseStatuses = (param: string | null) => {
  const raw = (param || '').toLowerCase();
  if (!raw || raw === 'pending') return ['submitted', 'seen'];
  if (raw === 'accepted') return ['accepted'];
  if (raw === 'rejected') return ['rejected'];
  if (raw === 'all') return [];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : ['submitted', 'seen'];
};

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const oppId = (url.searchParams.get('opportunity_id') || url.searchParams.get('opportunityId') || '').trim();
  const statuses = parseStatuses(url.searchParams.get('status'));

  let q = supabase
    .from('applications')
    .select('id, opportunity_id, status, created_at, note, club_id')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });

  if (oppId) q = q.eq('opportunity_id', oppId);
  if (statuses.length) q = q.in('status', statuses);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 400);

  const apps = data ?? [];
  if (!apps.length) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const oppIds = Array.from(new Set(apps.map((a) => a.opportunity_id).filter(Boolean) as string[]));
  const { data: opps, error: oppErr } = await supabase
    .from('opportunities')
    .select('id,title,club_id,club_name,sport,sport_id,sport_discipline_id,sport_variant_id,role,role_group,player_position_id,staff_role_id,gender,gender_code')
    .in('id', oppIds);
  if (oppErr) return jsonError(oppErr.message, 400);

  const oppMap = new Map((opps ?? []).map((o: any) => [o.id, o]));
  const enriched = apps.map((a: any) => ({
    ...a,
    opportunity: oppMap.has(a.opportunity_id)
      ? { ...oppMap.get(a.opportunity_id), ...projectOpportunityCanonicalContext(oppMap.get(a.opportunity_id)) }
      : null,
  }));

  return NextResponse.json({ data: enriched }, { headers: { 'Cache-Control': 'no-store' } });
});
