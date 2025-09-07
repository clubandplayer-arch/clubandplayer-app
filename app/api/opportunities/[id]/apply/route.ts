import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

// POST /api/opportunities/:id/apply
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  // ricava l'id dall'URL (niente params nel wrapper)
  const path = new URL(req.url).pathname;
  const m = path.match(/\/opportunities\/([^/]+)\/apply$/);
  const opportunityId = m?.[1];
  if (!opportunityId) return jsonError('Missing opportunity id', 400);

  const body = await req.json().catch(() => ({}));
  const note = (body.note ?? '').trim() || null;

  // Solo gli atleti possono candidarsi
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, user_id, type')
    .eq('user_id', user.id)
    .single();

  if (pErr) return jsonError(pErr.message, 400);
  if (profile?.type !== 'athlete') return jsonError('Only athletes can apply', 403);

  const { error } = await supabase
    .from('applications')
    .insert({
      opportunity_id: opportunityId,
      athlete_id: profile.id,
      note,
      status: 'submitted',
    });

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
