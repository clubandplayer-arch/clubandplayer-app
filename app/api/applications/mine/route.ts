import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const oppId = (url.searchParams.get('opportunityId') || '').trim();

  let q = supabase
    .from('applications')
    .select('id, opportunity_id, status, created_at, note')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (oppId) q = q.eq('opportunity_id', oppId);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data: data ?? [] });
});
