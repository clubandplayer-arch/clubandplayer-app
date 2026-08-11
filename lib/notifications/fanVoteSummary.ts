import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfileByUserId } from '@/lib/api/profile';

export type PlayerFanVoteSummary = {
  id: string;
  kind: 'player_fan_vote_summary';
  playerProfileId: string;
  voteCount: number;
  latestVoteAt: string;
};

export async function getPlayerFanVoteSummary(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
): Promise<PlayerFanVoteSummary | null> {
  const profile = await getProfileByUserId(supabase, userId, { activeOnly: true });
  const accountType = (profile?.account_type ?? '').toLowerCase();
  if (!profile?.id || (accountType !== 'athlete' && accountType !== 'player')) return null;

  const { data, error } = await supabase
    .from('current_player_fan_vote_counts')
    .select('player_profile_id, vote_count')
    .eq('player_profile_id', profile.id)
    .maybeSingle();

  if (error) {
    console.warn('[fan-votes/summary] count lookup failed', { message: error.message });
    return null;
  }

  const voteCount = Number((data as any)?.vote_count ?? 0);
  if (!Number.isFinite(voteCount) || voteCount <= 0) return null;

  const { data: latestVote, error: latestVoteError } = await supabase
    .from('player_fan_votes')
    .select('created_at')
    .eq('player_profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVoteError || !latestVote?.created_at) {
    console.warn('[fan-votes/summary] latest vote lookup failed', {
      message: latestVoteError?.message ?? 'missing created_at',
    });
    return null;
  }

  return {
    id: `player_fan_vote_summary:${profile.id}:${latestVote.created_at}`,
    kind: 'player_fan_vote_summary',
    playerProfileId: profile.id,
    voteCount,
    latestVoteAt: latestVote.created_at,
  };
}
