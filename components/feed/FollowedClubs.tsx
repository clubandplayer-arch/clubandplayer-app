/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';

type Role = 'club' | 'athlete' | 'guest';

type FollowedItem = {
  id: string;
  name: string;
  city: string | null;
  sport: string | null;
  avatarUrl?: string | null;
  accountType: 'club' | 'athlete';
};

function targetHref(item: FollowedItem) {
  return item.accountType === 'club' ? `/clubs/${item.id}` : `/athletes/${item.id}`;
}

export default function FollowedClubs() {
  const [role, setRole] = useState<Role>('guest');
  const [items, setItems] = useState<FollowedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/follows/list', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const nextRole: Role =
          data?.role === 'club' || data?.role === 'athlete' ? data.role : 'guest';
        const rows: FollowedItem[] = Array.isArray(data?.items)
          ? (data.items as FollowedItem[])
          : [];
        setRole(nextRole);
        setItems(rows);
      } catch (err: any) {
        setError(err?.message || 'Errore nel recupero dei profili seguiti');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const heading = role === 'club' ? 'Player che segui' : 'Club che segui';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{heading}</div>
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{heading}</div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : items.length > 0 ? (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <img
                src={
                  item.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}`
                }
                alt={item.name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={targetHref(item)}
                  className="truncate text-sm font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
                >
                  {item.name}
                </a>
                <div className="truncate text-xs text-zinc-500">
                  {item.city || ''}
                  {item.sport ? `${item.city ? ' · ' : ''}${item.sport}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-zinc-600 dark:border-zinc-800">
          {role === 'club'
            ? 'Inizia a seguire player per vederli qui.'
            : 'Inizia a seguire club per vederli qui.'}
        </div>
      )}
    </div>
  );
}
