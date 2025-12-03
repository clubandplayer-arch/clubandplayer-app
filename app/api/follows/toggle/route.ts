import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const body = (await req.json().catch(() => ({}))) as { targetProfileId?: string };
  const targetProfileId = (body?.targetProfileId || '').trim();
  if (!targetProfileId) return jsonError('targetProfileId mancante', 400);

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
