import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  notAuthorized,
  notFoundError,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';
import { ToggleFollowSchema, type ToggleFollowInput } from '@/lib/validation/follow';

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
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');

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

    return successResponse({ isFollowing: true, targetProfileId: target.id });
  } catch (error: any) {
    console.error('[api/follows/toggle] errore', { error, targetProfileId });
    return unknownError({ endpoint: '/api/follows/toggle', error, context: { targetProfileId } });
  }
});

export const GET = async () => NextResponse.json({ error: 'Metodo non supportato' }, { status: 405 });
