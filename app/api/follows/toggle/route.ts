import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  notAuthorized,
  notFoundError,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';
import { ToggleFollowSchema, type ToggleFollowInput } from '@/lib/validation/follow';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const parsedBody = ToggleFollowSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    console.warn('[api/follows/toggle][POST] invalid payload', parsedBody.error.flatten());
    return validationError('Payload non valido', parsedBody.error.flatten());
  }

  const body: ToggleFollowInput = parsedBody.data;
  const targetProfileId = body.targetProfileId;
  
  try {
    const admin = getSupabaseAdminClientOrNull();
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');
    const meProfile = await getProfileById(supabase, me.id);
    if (!meProfile) return notAuthorized('Profilo non trovato');

    const target = await getProfileById(supabase, targetProfileId);
    if (!target) return notFoundError('Profilo target non trovato');

    if (me.id === target.id) {
      return successResponse({ isFollowing: false, self: true, targetProfileId: target.id });
    }

    const { data: existing, error: findError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_profile_id', me.id)
      .eq('target_profile_id', target.id)
      .maybeSingle();
    if (findError) throw findError;

    if (existing?.id) {
      const { error: delError } = await supabase.from('follows').delete().eq('id', existing.id);
      if (delError) throw delError;
      return successResponse({ isFollowing: false, targetProfileId: target.id });
    }

    const { error: insertError } = await supabase.from('follows').insert({
      follower_profile_id: me.id,
      target_profile_id: target.id,
    });
    if (insertError) throw insertError;

    const notificationClient = admin ?? supabase;

    if (!target.user_id) {
      console.warn('[api/follows/toggle] follow notification skipped: missing target user_id', {
        targetProfileId: target.id,
        actorProfileId: me.id,
      });
    } else {
      const { error: notificationError } = await notificationClient.from('notifications').insert({
        user_id: target.user_id,
        recipient_profile_id: target.id,
        actor_profile_id: me.id,
        kind: 'new_follower',
        payload: {
          followerProfileId: me.id,
          followerType: meProfile.account_type ?? null,
          followedProfileId: target.id,
        },
      });
      if (notificationError) {
        console.warn('[api/follows/toggle] follow notification insert failed', {
          targetProfileId: target.id,
          actorProfileId: me.id,
          targetUserId: target.user_id,
          usedAdminClient: Boolean(admin),
          message: notificationError.message,
        });
      }
    }

    return successResponse({ isFollowing: true, targetProfileId: target.id });
  } catch (error: any) {
    console.error('[api/follows/toggle] errore', { error, targetProfileId });
    return unknownError({ endpoint: '/api/follows/toggle', error, context: { targetProfileId } });
  }
});

export const GET = async () => NextResponse.json({ error: 'Metodo non supportato' }, { status: 405 });
