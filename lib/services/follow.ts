export type FollowStateResponse = {
  ok: boolean;
  profileId: string | null;
  followingIds: string[];
  followerIds: string[];
  error?: string;
};

export type ToggleFollowResponse = {
  ok: boolean;
  isFollowing: boolean;
  targetId?: string;
  error?: string;
};

type TargetType = 'club' | 'player' | 'athlete';

function normalizeTargetType(targetType: TargetType): 'club' | 'player' {
  if (targetType === 'club') return 'club';
  return 'player';
}

export async function fetchFollowState(): Promise<FollowStateResponse> {
  console.log('[follow-service] fetching follow state');
  const res = await fetch('/api/follows', { cache: 'no-store' });
  const json = await res.json().catch(() => ({ ok: false, error: 'invalid_json' }));

  if (!res.ok) {
    console.error('[follow-service] fetchFollowState failed', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : 'follow_state_error');
  }

  console.log('[follow-service] fetchFollowState success', {
    profileId: json?.profileId,
    followingCount: Array.isArray(json?.followingIds) ? json.followingIds.length : 0,
    followerCount: Array.isArray(json?.followerIds) ? json.followerIds.length : 0,
  });

  return json as FollowStateResponse;
}

export async function toggleFollow(targetId: string, targetType: TargetType): Promise<ToggleFollowResponse> {
  const normalizedType = normalizeTargetType(targetType);
  console.log('[follow-service] toggle start', { targetId, targetType: normalizedType });

  const res = await fetch('/api/follows/toggle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetId, targetType: normalizedType }),
  });

  const json = await res.json().catch(() => ({ ok: false, error: 'invalid_json' }));

  if (!res.ok || !json?.ok) {
    console.error('[follow-service] toggle error', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : 'toggle_follow_error');
  }

  console.log('[follow-service] toggle success', { targetId: json?.targetId ?? targetId, isFollowing: json?.isFollowing });
  return json as ToggleFollowResponse;
}
