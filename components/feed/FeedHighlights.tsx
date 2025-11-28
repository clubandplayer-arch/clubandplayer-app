'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { Opportunity } from '@/types/opportunity';

type Role = 'club' | 'athlete' | 'guest';

type HighlightItem = Opportunity & {
  created_at?: string | null;
  club_name?: string | null;
};

function formatDate(raw?: string | null) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(date);
}

export default function FeedHighlights() {
  const [role, setRole] = useState<Role>('guest');
  const [items, setItems] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/feed/highlights', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const nextRole: Role =
          data?.role === 'club' || data?.role === 'athlete' ? data.role : 'guest';
        const rows: HighlightItem[] = Array.isArray(data?.items)
          ? (data.items as HighlightItem[])
          : [];
        setRole(nextRole);
        setItems(rows);
      } catch (err: any) {
        setError(err?.message || 'Errore nel recupero delle opportunità');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const emptyCopy =
    role === 'club'
      ? 'Non hai ancora creato opportunità.'
      : 'Non ci sono opportunità in evidenza nella tua zona.';
  const subtitle = role === 'club' ? 'Le tue ultime opportunità' : 'Opportunità vicino a te';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-200/80 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">In evidenza</div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : items.length > 0 ? (
        <ul className="space-y-3">
          {items.slice(0, 5).map((opp) => (
            <li key={opp.id} className="rounded-xl border border-zinc-200 bg-white/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <Link
                href={`/opportunities/${opp.id}`}
                className="text-sm font-semibold text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                {opp.title || 'Opportunità'}
              </Link>
              <div className="mt-1 text-xs text-zinc-500">
                {opp.club_name ? `${opp.club_name} · ` : ''}
                {[opp.city, opp.country].filter(Boolean).join(', ')}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-amber-600">
                {formatDate(opp.created_at)}
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
