import { NextResponse, type NextRequest } from 'next/server';
import { badRequest, ok } from '@/lib/api/responses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
    return badRequest('Errore profilo');
  }

  if (!profile?.id || profile.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'inactive_profile', profileId: profile?.id ?? null, followingIds: [], followerIds: [] });
  }

  const { data: follows, error } = await supabase
    .from('follows')
    .select('target_profile_id')
    .eq('follower_profile_id', profile.id)
    .limit(400);

  const { data: followers, error: followerErr } = await supabase
    .from('follows')
    .select('follower_profile_id')
    .eq('target_profile_id', profile.id)
    .limit(400);

  if (error || followerErr) {
    console.error('[api/follows] errore lettura follows', error || followerErr);
    return badRequest('Errore nel recupero dei follow');
  }

  const ids = (follows || [])
    .map((row) => (row as any)?.target_profile_id)
    .filter(Boolean) as string[];
  const followerIds = (followers || [])
    .map((row) => (row as any)?.follower_profile_id)
    .filter(Boolean) as string[];

  return ok({
    profileId: profile.id,
    followingIds: ids,
    followerIds,
    data: ids,
  });
}
