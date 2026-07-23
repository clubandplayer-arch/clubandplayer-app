import type { NotificationWithActor } from '@/types/notifications';

export type FanVoteSummaryPayload = {
  id?: string;
  kind?: string;
  playerProfileId?: string;
  voteCount?: number;
  createdAt?: string;
} | null;

const STORAGE_PREFIX = 'clubandplayer:player-fan-vote-summary-read:';

export function fanVoteSummaryReadKey(summary: FanVoteSummaryPayload) {
  if (!summary?.playerProfileId || !summary?.voteCount) return null;
  return `${STORAGE_PREFIX}${summary.playerProfileId}:${summary.voteCount}`;
}

export function isFanVoteSummaryRead(summary: FanVoteSummaryPayload) {
  if (typeof window === 'undefined') return false;
  const key = fanVoteSummaryReadKey(summary);
  return key ? window.localStorage.getItem(key) === '1' : false;
}

export function markFanVoteSummaryRead(summary: FanVoteSummaryPayload) {
  if (typeof window === 'undefined') return;
  const key = fanVoteSummaryReadKey(summary);
  if (key) window.localStorage.setItem(key, '1');
}

export function notificationToFanVoteSummary(notification: NotificationWithActor): FanVoteSummaryPayload {
  if (notification.kind !== 'player_fan_vote_summary') return null;
  const payload = notification.payload || {};
  const playerProfileId =
    typeof payload.player_profile_id === 'string'
      ? payload.player_profile_id
      : notification.recipient_profile_id ?? undefined;
  const voteCount = Number((payload as any).vote_count ?? (payload as any).voteCount ?? 0);
  return {
    id: notification.id,
    kind: notification.kind,
    playerProfileId,
    voteCount,
    createdAt: notification.created_at,
  };
}

export function applyFanVoteSummaryReadState(items: NotificationWithActor[]) {
  return items.map((item) => {
    const summary = notificationToFanVoteSummary(item);
    if (!summary || !isFanVoteSummaryRead(summary)) return item;
    return { ...item, read: true, read_at: item.read_at ?? item.created_at };
  });
}
