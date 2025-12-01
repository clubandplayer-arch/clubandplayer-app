import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

type TargetType = 'club' | 'player';

function normalizeType(raw?: string | null): TargetType | null {
  const val = (raw || '').toLowerCase();
  if (val === 'club') return 'club';
  if (val === 'player' || val === 'athlete') return 'player';
  return null;
}

async function getActiveProfile(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').getSupabaseServerClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
  return data;
}

async function getTargetProfile(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').getSupabaseServerClient>>,
  rawTargetId: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .or(`id.eq.${rawTargetId},user_id.eq.${rawTargetId}`)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
  return data;
}

export const GET = async () => NextResponse.json({ ok: false, error: 'Metodo non supportato' }, { status: 405 });

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const body = (await req.json().catch(() => ({}))) as { targetId?: string; targetType?: string };
  const targetId = (body?.targetId || '').trim();
  const targetType = normalizeType(body?.targetType);

  if (!targetId) return jsonError('targetId mancante', 400);
  if (!targetType) return jsonError('targetType non valido', 400);

  try {
    const profile = await getActiveProfile(supabase, user.id);
    if (!profile) return jsonError('no_profile', 403);

    const targetProfile = await getTargetProfile(supabase, targetId);
    if (!targetProfile) return jsonError('target_not_found', 404);

    const { data: existing, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', profile.id)
      .eq('target_id', targetProfile.id)
      .maybeSingle();
    if (checkError) throw checkError;

    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;

      return NextResponse.json({ ok: true, isFollowing: false, targetId: targetProfile.id });
    }

    const { error: insertError } = await supabase.from('follows').insert({
      follower_id: profile.id,
      target_id: targetProfile.id,
      target_type: targetType,
    });
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, isFollowing: true, targetId: targetProfile.id });
  } catch (error: any) {
    console.error('API /follows/toggle error', {
      followerId: user.id,
      targetId,
      targetType,
      error,
    });
    return jsonError('db_error', 500);
  }
});
