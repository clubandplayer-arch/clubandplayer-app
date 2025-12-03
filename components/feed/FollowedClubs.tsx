/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCurrentProfileContext, type ProfileRole } from '@/hooks/useCurrentProfileContext';

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

function subtitle(item: FollowedItem, viewerRole: ProfileRole) {
  const location = item.city || '';
  const sport = item.sport || '';
  if (viewerRole === 'club') {
    return [sport, location].filter(Boolean).join(' · ');
  }
  return [location, sport].filter(Boolean).join(' · ');
}

export default function FollowedClubs() {
  const { role: contextRole, profile } = useCurrentProfileContext();
  const [role, setRole] = useState<ProfileRole>('guest');
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
        const nextRole: ProfileRole =
          data?.role === 'club' || data?.role === 'athlete' ? data.role : contextRole;
        const rows: FollowedItem[] = Array.isArray(data?.items)
          ? (data.items as any[])
              .map((item) => {
                const accountType: 'club' | 'athlete' = item.account_type === 'club' ? 'club' : 'athlete';
                return {
                  id: item.id,
                  name: item.name ?? item.display_name ?? 'Profilo',
                  city: item.city ?? item.country ?? null,
                  sport: item.sport ?? null,
                  avatarUrl: item.avatar_url ?? item.avatarUrl ?? null,
                  accountType,
                };
              })
              .filter((item) => !profile?.id || item.id !== profile.id)
          : [];
        setRole(nextRole);
        setItems(rows);
      } catch (err: any) {
        setError(err?.message || 'Errore nel recupero dei profili seguiti');
      } finally {
        setLoading(false);
      }
    })();
  }, [contextRole, profile?.id]);

  const heading = 'Profili che segui';
  const emptyCopy = 'Inizia a seguire profili per vederli qui.';

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
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.name}
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                    {item.accountType === 'club' ? 'Club' : 'Player'}
                  </span>
                </div>
                <div className="truncate text-xs text-zinc-500">{subtitle(item, role)}</div>
                <Link
                  href={targetHref(item)}
                  className="mt-1 inline-flex text-xs font-semibold text-blue-600 underline-offset-2 hover:underline"
                >
                  Visita profilo
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-zinc-600 dark:border-zinc-800">{emptyCopy}</div>
      )}
    </div>
  );
}
