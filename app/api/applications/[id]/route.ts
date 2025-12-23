import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function getProfileIdByUser(client: any, userId: string | null | undefined) {
  if (!userId) return null;
  const { data } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function notifyApplicantStatus(params: {
  admin: any;
  athleteId: string | null | undefined;
  actorUserId: string;
  applicationId: string;
  opportunityId: string;
  opportunityTitle?: string | null;
  status: string;
}) {
  const { admin, athleteId, actorUserId, applicationId, opportunityId, opportunityTitle, status } = params;
  if (!admin || !athleteId) return;

  try {
    const [recipientProfileId, actorProfileId] = await Promise.all([
      getProfileIdByUser(admin, athleteId),
      getProfileIdByUser(admin, actorUserId),
    ]);

    await admin.from('notifications').insert({
      user_id: athleteId,
      recipient_profile_id: recipientProfileId,
      actor_profile_id: actorProfileId,
      kind: 'application_status',
      payload: {
        application_id: applicationId,
        opportunity_id: opportunityId,
        opportunity_title: opportunityTitle ?? null,
        status,
      },
      read: false,
    });
  } catch (err) {
    console.warn('notifyApplicantStatus failed', err);
  }
}

// PATCH /api/applications/:id   { status: 'submitted'|'seen'|'accepted'|'rejected' }
// Solo l'owner dell'opportunità può cambiare lo status
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:PATCH', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  const allowed = ['submitted', 'seen', 'accepted', 'rejected'];
  if (!allowed.includes(status)) return jsonError('Invalid status', 400);

  // Recupero candidatura e opportunità collegata
  const { data: app, error: e1 } = await supabase
    .from('applications')
    .select('opportunity_id, athlete_id, status')
    .eq('id', id)
    .single();
  if (e1) return jsonError(e1.message, 400);

  const { data: opp, error: e2 } = await supabase
    .from('opportunities')
    .select('owner_id, created_by, title')
    .eq('id', app.opportunity_id)
    .maybeSingle();
  if (e2) return jsonError(e2.message, 400);

  let ownerId = (opp as any)?.owner_id ?? null;
  if ((!opp || !ownerId) && !e2) {
    const legacy = await supabase
      .from('opportunities')
      .select('created_by')
      .eq('id', app.opportunity_id)
      .maybeSingle();
    if (!legacy.error && legacy.data) {
      ownerId = (legacy.data as any).created_by ?? null;
    }
  }
  if (!ownerId || ownerId !== user.id) return jsonError('Forbidden', 403);

  const previousStatus = (app as any)?.status ?? null;

  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select('id, status, athlete_id, opportunity_id, note, created_at, updated_at')
    .single();
  if (error) return jsonError(error.message, 400);

  const admin = getSupabaseAdminClientOrNull();
  if (admin && previousStatus !== status && (status === 'accepted' || status === 'rejected')) {
    await notifyApplicantStatus({
      admin,
      athleteId: (app as any)?.athlete_id ?? data?.athlete_id ?? null,
      actorUserId: user.id,
      applicationId: id,
      opportunityId: app.opportunity_id,
      opportunityTitle: (opp as any)?.title ?? null,
      status,
    });
  }

  return NextResponse.json({ data });
});

// DELETE /api/applications/:id
// L'atleta può ritirare la propria; l'owner può rimuovere una candidatura
export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:DELETE', limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const { data: app, error: e1 } = await supabase
    .from('applications')
    .select('athlete_id, opportunity_id')
    .eq('id', id)
    .single();
  if (e1) return jsonError(e1.message, 400);

  // Se non è l'atleta, verifico che sia l'owner dell'opportunità
  if (app.athlete_id !== user.id) {
    const { data: opp, error: e2 } = await supabase
      .from('opportunities')
      .select('owner_id')
      .eq('id', app.opportunity_id)
      .maybeSingle();
    if (e2) return jsonError(e2.message, 400);
    let ownerId = (opp as any)?.owner_id ?? null;
    if ((!opp || !ownerId) && !e2) {
      const legacy = await supabase
        .from('opportunities')
        .select('created_by')
        .eq('id', app.opportunity_id)
        .maybeSingle();
      if (!legacy.error && legacy.data) {
        ownerId = (legacy.data as any).created_by ?? null;
      }
    }
    if (!ownerId || ownerId !== user.id) return jsonError('Forbidden', 403);
  }

  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
});
