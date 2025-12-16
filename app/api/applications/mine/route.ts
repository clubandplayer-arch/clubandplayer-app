import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const oppId = (url.searchParams.get('opportunityId') || '').trim();

  const ids = new Set<string>([user.id]);
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (prof?.id) ids.add(String(prof.id));
  } catch {
    // ignore profile lookup
  }

  const athleteIds = Array.from(ids);

  let q = supabase
    .from('applications')
    .select('id, opportunity_id, status, created_at, note')
    .order('created_at', { ascending: false });

  if (athleteIds.length > 1) {
    q = q.in('athlete_id', athleteIds);
  } else {
    q = q.eq('athlete_id', athleteIds[0]);
  }
  if (oppId) q = q.eq('opportunity_id', oppId);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
