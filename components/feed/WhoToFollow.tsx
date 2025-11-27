/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Role = 'club' | 'athlete' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  sport?: string;
  followers?: number;
};

export default function WhoToFollow() {
  const [role, setRole] = useState<Role>('guest');
  const [targetType, setTargetType] = useState<Role>('club');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/follows/suggestions', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        const suggestions = Array.isArray(data?.items) ? (data.items as Suggestion[]) : [];
        const nextRole: Role =
          data?.role === 'club' || data?.role === 'athlete' ? data.role : 'guest';
        const nextTarget: Role =
          data?.targetType === 'club' || data?.targetType === 'athlete' ? data.targetType : 'club';
        setRole(nextRole);
        setTargetType(nextTarget);
        setItems(suggestions.slice(0, 3));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function follow(id: string) {
    setPendingId(id);
    try {
      const supabase = supabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error('not_authenticated');

      await supabase.from('follows').upsert({
        follower_id: user.user.id,
        target_id: id,
        target_type: targetType === 'club' ? 'club' : 'player',
      });

      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      if (String(err?.message || '').includes('not_authenticated')) {
        alert('Accedi per seguire nuovi profili.');
      }
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1">
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const heading = role === 'club' ? 'Player suggeriti' : 'Club suggeriti';

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{heading}</div>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((it) => {
            const isPending = pendingId === it.id;
            return (
              <li key={it.id} className="flex items-center gap-3">
                <img
                  src={
                    it.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(it.name)}`
                  }
                  alt={it.name}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.name}</div>
                  <div className="truncate text-xs text-zinc-500">
                    {it.city ? `${it.city}` : ''}
                    {it.sport ? `${it.city ? ' · ' : ''}${it.sport}` : ''}
                    {typeof it.followers === 'number' ? ` · ${it.followers} follower` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => follow(it.id)}
                  disabled={isPending}
                  aria-busy={isPending}
                  className={[
                    'rounded-xl border px-3 py-1.5 text-sm font-semibold transition',
                    'hover:bg-zinc-50 dark:hover:bg-zinc-800',
                    isPending ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  {isPending ? '...' : 'Segui'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {role === 'club'
            ? 'Non ci sono ancora player da suggerire nella tua zona.'
            : 'Non ci sono ancora club da suggerire nella tua zona.'}
        </div>
      )}
    </div>
  );
}
