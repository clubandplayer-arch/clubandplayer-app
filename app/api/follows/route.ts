import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

// Restituisce lo stato dei follow (chi segui e chi ti segue)
export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated', profileId: null, followingIds: [], followerIds: [] });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('user_id', userRes.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[api/follows] errore profilo', profileError);
    return jsonError('Errore profilo', 400);
  }

  if (!profile?.id || profile.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'inactive_profile', profileId: profile?.id ?? null, followingIds: [], followerIds: [] });
  }

  const { data: follows, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('follower_id', profile.id)
    .limit(400);

  const { data: followers, error: followerErr } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('target_id', profile.id)
    .limit(400);

  if (error || followerErr) {
    console.error('[api/follows] errore lettura follows', error || followerErr);
    return jsonError('Errore nel recupero dei follow', 400);
  }

  const ids = (follows || [])
    .map((row) => row?.target_id)
    .filter(Boolean) as string[];
  const followerIds = (followers || [])
    .map((row) => row?.follower_id)
    .filter(Boolean) as string[];

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    followingIds: ids,
    followerIds,
    data: ids,
  });
}
