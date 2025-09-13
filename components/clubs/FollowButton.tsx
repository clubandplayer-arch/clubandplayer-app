'use client';

import { useEffect, useState } from 'react';

export const LS_FOLLOW_KEY = 'cp_followed_clubs_v1';

type FollowMap = Record<string, { name?: string; followedAt: number }>;

function safeWindow() {
  return typeof window !== 'undefined';
}

function readFollowed(): FollowMap {
  if (!safeWindow()) return {};
  try {
    const raw = localStorage.getItem(LS_FOLLOW_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeFollowed(data: FollowMap) {
  if (!safeWindow()) return;
  try {
    localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(data));
    // notifica chi ascolta (lo storage event non scatta nella stessa tab)
    window.dispatchEvent(new CustomEvent('cp:followed-clubs-changed'));
  } catch {
    /* noop */
  }
}

export default function FollowButton({
  clubId,
  clubName,
  size = 'sm',
  className = '',
}: {
  clubId?: string | null;
  clubName?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!clubId) return; // niente ID → niente follow
    const id = String(clubId);
    const data = readFollowed();
    setFollowing(Boolean(data[id]));
  }, [clubId]);

  if (!clubId) {
    // niente ID → non mostriamo il bottone
    return null;
  }

  function toggle() {
    const id = String(clubId); // narrow a string
    const data = readFollowed();
    if (data[id]) {
      delete data[id];
      setFollowing(false);
    } else {
      data[id] = { name: clubName || undefined, followedAt: Date.now() };
      setFollowing(true);
    }
    writeFollowed(data);
  }

  const base =
    'rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 transition ' +
    (following
      ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
      : 'bg-white text-gray-900');

  const md =
    'rounded-lg border px-3 py-1.5 text-sm ' +
    (following
      ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
      : 'bg-white text-gray-900 hover:bg-gray-50');

  return (
    <button
      onClick={toggle}
      className={`${size === 'md' ? md : base} ${className}`}
      aria-pressed={following}
      aria-label={following ? 'Seguito' : 'Segui'}
      title={following ? 'Seguito' : 'Segui'}
      type="button"
    >
      {following ? 'Seguito' : 'Segui'}
    </button>
  );
}
