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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        const nextRole: Role = raw === 'club' || raw === 'athlete' ? raw : 'guest';
        setRole(nextRole);

        const qs = new URLSearchParams({ for: nextRole });
        const s = await fetch(`/api/follows/suggestions?${qs.toString()}`, { credentials: 'include', cache: 'no-store' });
        const data = await s.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  if (!items.length) {
    return null;
  }

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
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3">
            <img
              src={it.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(it.name)}`}
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
              className="rounded-xl border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
              disabled
              title="CTA 'Segui' in arrivo (stub)"
            >
              Segui
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
