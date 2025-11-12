'use client';

import { useEffect, useMemo, useState } from 'react';
import { LS_FOLLOW_KEY } from '@/components/clubs/FollowButton';

type FollowMap = Record<string, { name?: string; followedAt: number }>;
export const LS_SHOW_ONLY_FOLLOWED = 'cp_followed_only_v1';

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
  } catch { return {}; }
}

function writeFollowed(data: FollowMap) {
  if (!safeWindow()) return;
  localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('cp:followed-clubs-changed'));
}

function readOnlyFollowed(): boolean {
  if (!safeWindow()) return false;
  return localStorage.getItem(LS_SHOW_ONLY_FOLLOWED) === '1';
}
function writeOnlyFollowed(v: boolean) {
  if (!safeWindow()) return;
  localStorage.setItem(LS_SHOW_ONLY_FOLLOWED, v ? '1' : '0');
  window.dispatchEvent(new CustomEvent('cp:followed-filter-changed'));
}

export default function FollowedClubs() {
  const [map, setMap] = useState<FollowMap>({});
  const [only, setOnly] = useState(false);

  useEffect(() => {
    setMap(readFollowed());
    setOnly(readOnlyFollowed());

    const onFollow = () => setMap(readFollowed());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_FOLLOW_KEY) setMap(readFollowed());
      if (e.key === LS_SHOW_ONLY_FOLLOWED) setOnly(readOnlyFollowed());
    };
    const onOnly = () => setOnly(readOnlyFollowed());

    window.addEventListener('cp:followed-clubs-changed', onFollow as any);
    window.addEventListener('cp:followed-filter-changed', onOnly as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cp:followed-clubs-changed', onFollow as any);
      window.removeEventListener('cp:followed-filter-changed', onOnly as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const entries = useMemo(
    () => Object.entries(map).sort((a, b) => (b[1]?.followedAt || 0) - (a[1]?.followedAt || 0)),
    [map]
  );

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Club seguiti</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-black"
            checked={only}
            onChange={(e) => writeOnlyFollowed(e.target.checked)}
          />
          Solo seguiti
        </label>
      </div>

      {!entries.length ? (
        <p className="mt-3 text-xs text-gray-600">Segui un club dalle opportunità per vederlo qui.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.slice(0, 8).map(([id, it]) => (
            <li key={id} className="flex items-center justify-between text-sm">
              <span className="truncate">{it.name ?? `Club ${id.slice(0, 6)}`}</span>
              <button
                type="button"
                onClick={() => {
                  const next = { ...map };
                  delete next[id];
                  writeFollowed(next);
                }}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                title="Smetti di seguire"
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}