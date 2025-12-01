import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

const VALID_TYPES = ['club', 'player'] as const;
type TargetType = (typeof VALID_TYPES)[number];
type Action = 'follow' | 'unfollow' | 'auto';

function normalizeType(raw?: string | null): TargetType | null {
  const val = (raw || '').toLowerCase();
  if (val === 'club') return 'club';
  if (val === 'athlete' || val === 'player') return 'player';
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

async function resolveTargetProfile(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').getSupabaseServerClient>>,
  targetId: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_type, status')
    .or(`id.eq.${targetId},user_id.eq.${targetId}`)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function currentState(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').getSupabaseServerClient>>,
  followerId: string,
  targetId: string,
) {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('target_id', targetId)
    .maybeSingle();
  return Boolean(data?.id);
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const targetId = url.searchParams.get('targetId')?.trim();
  const typeParam = normalizeType(url.searchParams.get('targetType'));

  if (!targetId) return jsonError('targetId mancante', 400);

  try {
    const profile = await getActiveProfile(supabase, user.id);
    if (!profile) return jsonError('Profilo non attivo', 403);

    const target = await resolveTargetProfile(supabase, targetId);
    if (!target?.id) return jsonError('Profilo target non trovato', 404);

    const normalizedType: TargetType =
      typeParam || (target.account_type === 'club' ? 'club' : 'player');

    const following = await currentState(supabase, profile.id, target.id);

    return NextResponse.json({
      ok: true,
      followerId: profile.id,
      targetId: target.id,
      targetType: normalizedType,
      following,
    });
  } catch (err: any) {
    console.error('[follows/toggle][GET] errore', err);
    return jsonError(err?.message || 'Errore inatteso', 500);
  }
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const body = (await req.json().catch(() => ({}))) as {
    targetId?: string;
    targetType?: string;
    action?: Action;
  };
  const targetId = (body?.targetId || '').trim();
  const requestedType = normalizeType(body?.targetType);
  const action: Action = body?.action === 'follow' || body?.action === 'unfollow' ? body.action : 'auto';

  if (!targetId) return jsonError('targetId mancante', 400);

  try {
    const profile = await getActiveProfile(supabase, user.id);
    if (!profile) return jsonError('Profilo non attivo', 403);

    const target = await resolveTargetProfile(supabase, targetId);
    if (!target?.id) return jsonError('Profilo target non trovato', 404);

    const targetType: TargetType =
      requestedType || (target.account_type === 'club' ? 'club' : 'player');

    const isFollowing = await currentState(supabase, profile.id, target.id);
    const shouldFollow = action === 'follow' ? true : action === 'unfollow' ? false : !isFollowing;

    if (shouldFollow && !isFollowing) {
      const { error: insertError } = await supabase.from('follows').upsert(
        {
          follower_id: profile.id,
          target_id: target.id,
          target_type: targetType,
        },
        { onConflict: 'follower_id,target_id' },
      );
      if (insertError) throw insertError;
    }

    if (!shouldFollow && isFollowing) {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', profile.id)
        .eq('target_id', target.id);
      if (deleteError) throw deleteError;
    }

    return NextResponse.json({
      ok: true,
      followerId: profile.id,
      targetId: target.id,
      targetType,
      following: shouldFollow,
    });
  } catch (err: any) {
    console.error('[follows/toggle][POST] errore', err);
    return jsonError(err?.message || 'Errore inatteso', 500);
  }
});
