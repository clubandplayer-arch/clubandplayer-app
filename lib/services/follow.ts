'use client';

export type FollowStateResponse = Record<string, boolean>;

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function toggleFollow(targetProfileId: string): Promise<{ isFollowing: boolean; targetProfileId: string }> {
  const target = (targetProfileId || '').trim();
  if (!target) throw new Error('targetProfileId mancante');

  const res = await fetch('/api/follows/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetProfileId: target }),
  });

  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[follow-service] toggle error', json);
    throw new Error(json?.error || 'Errore toggle follow');
  }

  return {
    isFollowing: Boolean((json as any)?.isFollowing),
    targetProfileId: target,
  };
}

export async function fetchFollowState(targetProfileIds: string[]): Promise<FollowStateResponse> {
  const clean = Array.from(new Set(targetProfileIds.map((id) => id.trim()).filter(Boolean)));
  if (!clean.length) return {};

  const params = new URLSearchParams();
  clean.forEach((id) => params.append('targets', id));

  const res = await fetch(`/api/follows/state?${params.toString()}`, { cache: 'no-store' });
  const json = await parseJson(res);
  if (!res.ok) {
    console.error('[follow-service] state error', json);
    throw new Error(json?.error || 'Errore lettura stato follow');
  }

  const state: FollowStateResponse = {};
  const payload = (json as any)?.state || {};
  clean.forEach((id) => {
    state[id] = Boolean(payload[id]);
  });
  return state;
}
