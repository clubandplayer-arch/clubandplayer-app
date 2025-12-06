import { type NextRequest } from 'next/server';
import { notAuthenticated, notAuthorized, successResponse, unknownError } from '@/lib/api/feedFollowResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Restituisce lo stato dei follow (chi segui e chi ti segue)
export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('user_id', userRes.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[api/follows] errore profilo', profileError);
    return unknownError({ endpoint: '/api/follows', error: profileError, context: { stage: 'profile', userId: userRes.user.id } });
  }

  if (!profile?.id || profile.status !== 'active') {
    return notAuthorized('Profilo non attivo');
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
    return unknownError({ endpoint: '/api/follows', error: error || followerErr, context: { stage: 'select', profileId: profile.id } });
  }

  const ids = (follows || [])
    .map((row) => (row as any)?.target_profile_id)
    .filter(Boolean) as string[];
  const followerIds = (followers || [])
    .map((row) => (row as any)?.follower_profile_id)
    .filter(Boolean) as string[];

  return successResponse({
    profileId: profile.id,
    followingIds: ids,
    followerIds,
    data: ids,
  });
}
