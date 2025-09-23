'use client';

import { useEffect, useState } from 'react';

type Role = 'club' | 'athlete' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  city?: string;
  sport?: string;
  followers?: number;
};

export default function WhoToFollow() {
  const [role, setRole] = useState<Role>('guest');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Ruolo
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        const nextRole: Role = raw === 'club' || raw === 'athlete' ? raw : 'guest';
        setRole(nextRole);

        // 2) Suggerimenti
        const qs = new URLSearchParams({ for: nextRole });
        const s = await fetch(`/api/follows/suggestions?${qs.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await s.json();
        setItems(Array.isArray(data?.items) ? data.items : []);

        // 3) Stato "seguito"
        const g = await fetch('/api/follows/toggle', { credentials: 'include', cache: 'no-store' });
        const gj = await g.json().catch(() => ({}));
        const ids: string[] = Array.isArray(gj?.ids) ? gj.ids : [];
        setFollowing(new Set(ids));
      } catch {
        setItems([]);
        setFollowing(new Set());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleFollow(id: string) {
    // optimistic UI
    setPendingId(id);
    const isFollowing = following.has(id);
    const prev = new Set(following);
    const next = new Set(following);

    if (isFollowing) next.delete(id);
    else next.add(id);

    setFollowing(next);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('toggle failed');
      const out = await res.json().catch(() => ({}));
      if (Array.isArray(out?.ids)) setFollowing(new Set(out.ids)); // riallinea allo stato server
    } catch {
      // rollback
      setFollowing(prev);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <aside className="rounded-2xl border bg-white/60 p-4 shadow-sm dark:bg-zinc-900/60">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Chi seguire</h3>
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
      </aside>
    );
  }

  if (!items.length) return null;

  const title =
    role === 'club'
      ? 'Atleti suggeriti'
      : role === 'athlete'
      ? 'Club da seguire'
      : 'Chi seguire';

  return (
    <aside className="rounded-2xl border bg-white/60 p-4 shadow-sm dark:bg-zinc-900/60">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{title}</h3>
      <ul className="space-y-3">
        {items.map((it) => {
          const isFollowing = following.has(it.id);
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
                  @{it.handle}
                  {it.city ? ` · ${it.city}` : ''}
                  {it.sport ? ` · ${it.sport}` : ''}
                  {typeof it.followers === 'number' ? ` · ${it.followers} follower` : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleFollow(it.id)}
                disabled={isPending}
                aria-pressed={isFollowing}
                title={isFollowing ? 'Seguito' : 'Segui'}
                className={[
                  'rounded-xl border px-3 py-1.5 text-sm font-semibold transition',
                  isFollowing
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800',
                  isPending ? 'opacity-70' : '',
                ].join(' ')}
              >
                {isPending ? '...' : isFollowing ? 'Seguito' : 'Segui'}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
