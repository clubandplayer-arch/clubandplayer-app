import type { NotificationWithActor } from '@/types/notifications';

export type FanVoteSummaryPayload = {
  id?: string;
  kind?: string;
  playerProfileId?: string;
  voteCount?: number;
  latestVoteAt?: string;
} | null;

const STORAGE_PREFIX = 'clubandplayer:player-fan-vote-summary-read:';

export function fanVoteSummaryReadKey(summary: FanVoteSummaryPayload) {
  if (!summary?.playerProfileId) return null;
  return `${STORAGE_PREFIX}${summary.playerProfileId}`;
}

export function hasFanVoteSummaryBeenRead(
  summary: FanVoteSummaryPayload,
  lastReadAt: string | null,
) {
  if (!summary?.latestVoteAt || !lastReadAt) return false;
  const latestVoteTime = Date.parse(summary.latestVoteAt);
  const lastReadTime = Date.parse(lastReadAt);
  return (
    Number.isFinite(latestVoteTime) &&
    Number.isFinite(lastReadTime) &&
    lastReadTime >= latestVoteTime
  );
}

export function isFanVoteSummaryRead(summary: FanVoteSummaryPayload) {
  if (typeof window === 'undefined') return false;
  const key = fanVoteSummaryReadKey(summary);
  if (!key || !summary?.latestVoteAt) return false;
  const lastReadAt = window.localStorage.getItem(key);
  return hasFanVoteSummaryBeenRead(summary, lastReadAt);
}

export function markFanVoteSummaryRead(summary: FanVoteSummaryPayload) {
  if (typeof window === 'undefined') return;
  const key = fanVoteSummaryReadKey(summary);
  if (key && summary?.latestVoteAt) {
    window.localStorage.setItem(key, summary.latestVoteAt);
  }
}

export function notificationToFanVoteSummary(notification: NotificationWithActor): FanVoteSummaryPayload {
  if (notification.kind !== 'player_fan_vote_summary') return null;
  const payload = notification.payload || {};
  const playerProfileId =
    typeof payload.player_profile_id === 'string'
      ? payload.player_profile_id
      : notification.recipient_profile_id ?? undefined;
  const voteCount = Number((payload as any).vote_count ?? (payload as any).voteCount ?? 0);
  const latestVoteAt =
    typeof payload.latest_vote_at === 'string'
      ? payload.latest_vote_at
      : notification.created_at;
  return {
    id: notification.id,
    kind: notification.kind,
    playerProfileId,
    voteCount,
    latestVoteAt,
  };
}

export function applyFanVoteSummaryReadState(items: NotificationWithActor[]) {
  return items.flatMap((item) => {
    const summary = notificationToFanVoteSummary(item);
    if (summary && isFanVoteSummaryRead(summary)) return [];
    return [item];
  });
}
