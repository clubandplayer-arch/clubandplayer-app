import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfileByUserId } from '@/lib/api/profile';

export type PlayerFanVoteSummary = {
  id: string;
  kind: 'player_fan_vote_summary';
  playerProfileId: string;
  voteCount: number;
  createdAt: string;
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

  return {
    id: `player_fan_vote_summary:${profile.id}:${voteCount}`,
    kind: 'player_fan_vote_summary',
    playerProfileId: profile.id,
    voteCount,
    createdAt: new Date().toISOString(),
  };
}
