import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';
import { ToggleFollowSchema, type ToggleFollowInput } from '@/lib/validation/follow';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const parsedBody = ToggleFollowSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    console.warn('[api/follows/toggle][POST] invalid payload', parsedBody.error.flatten());
    return NextResponse.json(
      {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Payload non valido',
        details: parsedBody.error.flatten(),
      },
      { status: 400 },
    );
  }

  const body: ToggleFollowInput = parsedBody.data;
  const targetProfileId = body.targetProfileId;
  
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const target = await getProfileById(supabase, targetProfileId);
    if (!target) return jsonError('profilo target non trovato', 404);

    if (me.id === target.id) {
      return NextResponse.json({ ok: true, isFollowing: false, self: true, targetProfileId: target.id });
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
      return NextResponse.json({ ok: true, isFollowing: false, targetProfileId: target.id });
    }

    const { error: insertError } = await supabase.from('follows').insert({
      follower_profile_id: me.id,
      target_profile_id: target.id,
    });
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, isFollowing: true, targetProfileId: target.id });
  } catch (error: any) {
    console.error('[api/follows/toggle] errore', { error, targetProfileId });
    return jsonError('server_error', 500);
  }
});

export const GET = async () => NextResponse.json({ error: 'Metodo non supportato' }, { status: 405 });
