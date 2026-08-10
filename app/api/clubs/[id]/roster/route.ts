import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';

export const runtime = 'nodejs';

async function extractClubId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const params = routeContext?.params ? await routeContext.params : null;
  const raw = (params as any)?.id;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

type PublicRosterPlayer = {
  player_id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  city: string | null;
  country: string | null;
  country_iso2: string | null;
  fan_vote_count: number;
};

export const GET = withAuth(async (req: NextRequest, { supabase }, routeContext) => {
  try {
    await rateLimit(req, { key: 'clubs:public-roster:get', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const clubId = await extractClubId(routeContext);
  const targetClubId = typeof clubId === 'string' ? clubId.trim() : '';
  if (!targetClubId) return jsonError('clubId mancante', 400);

  const { data: clubProfile, error: clubError } = await applyPublicProfileVisibilityFilters(
    supabase.from('profiles').select('id, account_type, type, status'),
  )
    .eq('id', targetClubId)
    .maybeSingle();

  if (clubError) return jsonError(clubError.message, 400);
  if (!clubProfile?.id) return jsonError('Club non trovato', 404);

  const accountType = String(clubProfile.account_type ?? clubProfile.type ?? '').toLowerCase();
  const status = String(clubProfile.status ?? '').toLowerCase();
  if (accountType !== 'club' || (status && status !== 'active')) {
    return jsonError('Club non trovato', 404);
  }

  const { data: rosterRows, error: rosterError } = await supabase
    .from('club_roster_members')
    .select('player_profile_id,status,created_at')
    .eq('club_profile_id', targetClubId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (rosterError) return jsonError(rosterError.message, 400);

  const playerIds = (rosterRows || []).map((row: any) => row.player_profile_id).filter(Boolean);
  if (!playerIds.length) return NextResponse.json({ ok: true, roster: [] });

  const { data: players, error: playersError } = await applyPublicProfileVisibilityFilters(
    supabase.from('players_view').select('id, full_name, display_name, avatar_url, role, city, country'),
  )
    .in('id', playerIds);

  if (playersError) return jsonError(playersError.message, 400);

  const playersMap = new Map((players || []).map((player: any) => [player.id, player]));
  const { data: voteRows } = await supabase
    .from('current_player_fan_vote_counts')
    .select('player_profile_id, vote_count')
    .in('player_profile_id', playerIds);
  const voteCountMap = new Map((voteRows || []).map((row: any) => [row.player_profile_id, Number(row.vote_count ?? 0)]));

  const roster: PublicRosterPlayer[] = (rosterRows || [])
    .map((row: any) => {
      const player = playersMap.get(row.player_profile_id);
      if (!player?.id) return null;
      const rawCountry = typeof player.country === 'string' ? player.country.trim() : '';
      const matchCountry = rawCountry.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
      const iso2 = matchCountry ? matchCountry[1].trim().toUpperCase() : null;

      return {
        player_id: player.id as string,
        full_name: player.full_name ?? null,
        display_name: player.display_name ?? null,
        avatar_url: player.avatar_url ?? null,
        role: player.role ?? null,
        city: player.city ?? null,
        country: player.country ?? null,
        country_iso2: iso2 ?? null,
        fan_vote_count: voteCountMap.get(player.id) ?? 0,
      } satisfies PublicRosterPlayer;
    })
    .filter(Boolean) as PublicRosterPlayer[];

  return NextResponse.json({ ok: true, roster });
});
