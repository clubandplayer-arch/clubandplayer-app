import { NextResponse, type NextRequest } from 'next/server';
import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

type Action = 'vote' | 'remove';

type FanVoteStateRow = {
  season_key: string;
  voting_open: boolean;
  voting_starts_on: string;
  voting_ends_on: string;
  vote_count: number;
  voted_by_me: boolean;
  used_votes: number;
  remaining_votes: number;
  can_vote: boolean;
};

async function extractProfileId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const params = routeContext?.params ? await routeContext.params : null;
  const raw = (params as any)?.id;
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  return '';
}

function toPayload(row: FanVoteStateRow | null) {
  return {
    seasonKey: row?.season_key ?? null,
    votingOpen: Boolean(row?.voting_open),
    votingStartsAt: row?.voting_starts_on ?? null,
    votingEndsAt: row?.voting_ends_on ?? null,
    voteCount: Number(row?.vote_count ?? 0),
    votedByMe: Boolean(row?.voted_by_me),
    usedVotes: Number(row?.used_votes ?? 0),
    remainingVotes: Number(row?.remaining_votes ?? 5),
    canVote: Boolean(row?.can_vote),
  };
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  try {
    await rateLimit(req, { key: `profiles:fan-vote:get:${user.id}`, limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const profileId = await extractProfileId(routeContext);
  if (!profileId) return jsonError('Id profilo mancante', 400);

  const { data, error } = await supabase.rpc('get_player_fan_vote_state', {
    target_player_profile_id: profileId,
  });
  if (error) return jsonError(error.message, 400);

  const row = Array.isArray(data) ? (data[0] as FanVoteStateRow | undefined) : null;
  return NextResponse.json({ ok: true, ...toPayload(row ?? null) });
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  try {
    await rateLimit(req, { key: `profiles:fan-vote:post:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const profileId = await extractProfileId(routeContext);
  if (!profileId) return jsonError('Id profilo mancante', 400);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? (body.action as Action) : null;
  if (action !== 'vote' && action !== 'remove') return jsonError('Azione non valida', 400);

  const rpcName = action === 'vote' ? 'cast_player_fan_vote' : 'remove_player_fan_vote';
  const { data, error } = await supabase.rpc(rpcName, {
    target_player_profile_id: profileId,
  });
  if (error) return jsonError(error.message, 400);

  const row = Array.isArray(data) ? (data[0] as FanVoteStateRow | undefined) : null;
  return NextResponse.json({ ok: true, action, ...toPayload(row ?? null) });
});
