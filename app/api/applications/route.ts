import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const missingClubColumn = (msg?: string | null) =>
  !!msg && /club_id/i.test(msg) && (/does not exist/i.test(msg) || /schema cache/i.test(msg));

const missingReadColumn = (msg?: string | null) =>
  !!msg && /\bread\b/i.test(msg) && (/does not exist/i.test(msg) || /schema cache/i.test(msg));

async function notifyClubApplicationReceived(params: {
  supabase: any;
  admin: any;
  ownerId: string | null;
  athleteUserId: string;
  opportunityId: string;
  opportunityTitle?: string | null;
  applicationId?: string | null;
}) {
  const { supabase, admin, ownerId, athleteUserId, opportunityId, opportunityTitle, applicationId } = params;
  if (!admin || !ownerId || !applicationId) return;

  let recipientUserId: string | null = ownerId;
  let recipientProfileId: string | null = null;

  const { data: profileByUser } = await admin
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', ownerId)
    .maybeSingle();

  if (profileByUser?.id) {
    recipientProfileId = profileByUser.id as string;
    recipientUserId = (profileByUser.user_id as string | null) ?? ownerId;
  } else {
    const { data: profileById } = await admin
      .from('profiles')
      .select('id, user_id')
      .eq('id', ownerId)
      .maybeSingle();

    if (profileById?.id) {
      recipientProfileId = profileById.id as string;
      recipientUserId = (profileById.user_id as string | null) ?? null;
    }
  }

  if (!recipientUserId || recipientUserId === athleteUserId) return;

  const actorProfileId = await (async () => {
    const { data: actorByUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', athleteUserId)
      .maybeSingle();
    if (actorByUser?.id) return actorByUser.id as string;

    const { data: actorById } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', athleteUserId)
      .maybeSingle();
    return (actorById?.id as string | undefined) ?? null;
  })();

  const notificationPayload = {
    user_id: recipientUserId,
    recipient_profile_id: recipientProfileId,
    actor_profile_id: actorProfileId,
    kind: 'application_received',
    payload: {
      application_id: applicationId,
      opportunity_id: opportunityId,
      opportunity_title: opportunityTitle ?? null,
      athlete_id: athleteUserId,
      status: 'submitted',
    },
    read: false,
  };

  let { error: nErr } = await admin.from('notifications').insert(notificationPayload);

  if (nErr && missingReadColumn(nErr.message)) {
    const { read: _read, ...fallbackPayload } = notificationPayload;
    ({ error: nErr } = await admin.from('notifications').insert(fallbackPayload));
  }

  if (nErr) {
    console.warn('notifyClubApplicationReceived: notifications insert failed', {
      error: nErr.message,
      recipientUserId,
      applicationId,
      opportunityId,
    });
  }
}

/** POST /api/applications  Body: { opportunity_id: string, note?: string } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  await rateLimit(req as any, { key: 'apps:POST', limit: 30, window: '1m' } as any);

  const body = await req.json().catch(() => null);
  if (!body || !body.opportunity_id) return jsonError('Missing opportunity_id', 400);

  const opportunity_id = String(body.opportunity_id);
  const note = typeof body.note === 'string'
    ? body.note.trim() || null
    : typeof body.message === 'string'
      ? body.message.trim() || null
      : null;
  const status = 'submitted';

  // verifica exist e che non sia tua
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by, title')
    .eq('id', opportunity_id)
    .single();

  if (oppErr) return jsonError(oppErr.message, 400);
  const ownerId = opp?.owner_id ?? opp?.created_by ?? null;
  if (ownerId === user.id) return jsonError('Cannot apply to your own opportunity', 403);

  // evita doppia candidatura
  const { data: exists } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', opportunity_id)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (exists) return jsonError('Already applied', 409);

  const admin = getSupabaseAdminClientOrNull();

  const insertPayload = {
    opportunity_id,
    athlete_id: user.id,
    club_id: ownerId,
    note,
    status,
  } as Record<string, any>;

  const runInsert = (client: any, payload: Record<string, any>, select: string) =>
    client.from('applications').insert(payload).select(select).single();

  let data: any = null;
  let error: any = null;

  ({ data, error } = await runInsert(supabase, insertPayload, 'id, opportunity_id, athlete_id, status, created_at, club_id'));

  if (error && missingClubColumn(error.message)) {
    const { club_id: _clubId, ...fallbackPayload } = insertPayload;
    ({ data, error } = await runInsert(supabase, fallbackPayload, 'id, opportunity_id, athlete_id, status, created_at'));
  }

  if (error && /row-level security/i.test(error.message || '') && admin) {
    ({ data, error } = await runInsert(admin, insertPayload, 'id, opportunity_id, athlete_id, status, created_at, club_id'));
  }

  if (error) return jsonError(error.message, 400);

  await notifyClubApplicationReceived({
    supabase,
    admin,
    ownerId,
    athleteUserId: user.id,
    opportunityId: opportunity_id,
    opportunityTitle: opp?.title ?? null,
    applicationId: data?.id,
  });

  return NextResponse.json({ data }, { status: 201 });
});
