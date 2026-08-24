'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Role = 'club' | 'athlete' | 'staff' | 'guest';

type Item = {
  id: string;
  title?: string | null;
  club_name?: string | null;
  city?: string | null;
  country?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok?: boolean;
  role?: Role;
  items?: Item[];
  meta?: {
    followedClubsCount?: number;
    totalReturned?: number;
  };
};

function formatDate(raw?: string | null) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(d);
}

export default function FeedFollowingOpportunities() {
  const [role, setRole] = useState<Role>('guest');
  const [items, setItems] = useState<Item[]>([]);
  const [followedClubsCount, setFollowedClubsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/feed/opportunities/following?limit=10', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data: ApiResponse = await res.json().catch(() => ({}));
        if (cancelled) return;
        setRole(data?.role && ['club', 'athlete', 'staff', 'guest'].includes(data.role) ? data.role : 'guest');
        setItems(Array.isArray(data?.items) ? data.items : []);
        setFollowedClubsCount(Number(data?.meta?.followedClubsCount ?? 0));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />;
  }

  if (role === 'guest') return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Club che segui</div>
        <Link href="/opportunities" className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline">
          Vedi tutte
        </Link>
      </div>

      {!followedClubsCount ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-zinc-600 dark:border-zinc-800">
          Segui dei club per vedere le loro opportunità.
        </div>
      ) : !items.length ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-zinc-600 dark:border-zinc-800">
          Nessuna opportunità aperta dai club che segui.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 3).map((opp) => (
            <li key={opp.id} className="rounded-xl border border-zinc-200 bg-white/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <Link href={`/opportunities/${opp.id}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                {opp.title || 'Opportunità'}
              </Link>
              <div className="mt-1 text-xs text-zinc-500">
                {opp.club_name ? `${opp.club_name} · ` : ''}
                {[opp.city, opp.country].filter(Boolean).join(', ')}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-amber-600">{formatDate(opp.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
