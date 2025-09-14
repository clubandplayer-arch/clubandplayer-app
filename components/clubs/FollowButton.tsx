'use client';

import { useEffect, useState } from 'react';

export const LS_FOLLOW_KEY = 'cp_followed_clubs_v1'; // chiave stabile per localStorage

type FollowMap = Record<string, { name?: string; followedAt: number }>;

function readFollowMap(): FollowMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_FOLLOW_KEY);
    return raw ? (JSON.parse(raw) as FollowMap) : {};
  } catch {
    return {};
  }
}

function writeFollowMap(map: FollowMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

export default function FollowButton({
  clubId,
  clubName,
  className,
  size = 'sm',
  onChange,
  defaultFollowing,
}: {
  clubId: string;
  clubName?: string;
  className?: string;
  size?: 'sm' | 'md';
  onChange?: (following: boolean) => void;
  defaultFollowing?: boolean;
}) {
  const [following, setFollowing] = useState<boolean>(!!defaultFollowing);
  const [loading, setLoading] = useState(false);

  // Hydrate da localStorage
  useEffect(() => {
    if (!clubId) return;
    const map = readFollowMap();
    if (map[clubId]) setFollowing(true);
  }, [clubId]);

  async function handleToggle() {
    if (!clubId || loading) return;
    setLoading(true);
    try {
      const next = !following;

      const res = await fetch(`/api/follows/${clubId}`, {
        method: next ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());

      // aggiorna localStorage
      const map = readFollowMap();
      if (next) {
        map[clubId] = { name: clubName, followedAt: Date.now() };
      } else {
        delete map[clubId];
      }
      writeFollowMap(map);

      setFollowing(next);
      onChange?.(next);
    } catch {
      // opzionale: toast errore
    } finally {
      setLoading(false);
    }
  }

  const base = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !clubId}
      className={`${base} rounded-lg border ${
        following ? 'bg-gray-900 text-white' : 'bg-white'
      } ${className ?? ''}`}
      aria-pressed={following}
    >
      {loading ? '...' : following ? 'Seguito' : 'Segui'}
    </button>
  );
}
