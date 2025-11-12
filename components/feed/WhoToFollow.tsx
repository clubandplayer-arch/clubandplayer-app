/* eslint-disable @next/next/no-img-element */
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Ruolo
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        const nextRole: Role = raw === 'club' || raw === 'athlete' ? raw : 'guest';
        setRole(nextRole);

        // 2) Prima pagina suggerimenti
        const { items: firstItems, nextCursor: nc } = await fetchSuggestions(nextRole);
        setItems(firstItems);
        setNextCursor(nc ?? null);

        // 3) Stato "seguito" (cookie-backed)
        const g = await fetch('/api/follows/toggle', { credentials: 'include', cache: 'no-store' });
        const gj = await g.json().catch(() => ({}));
        const ids: string[] = Array.isArray(gj?.ids) ? gj.ids : [];
        setFollowing(new Set(ids));
      } catch {
        setItems([]);
        setFollowing(new Set());
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function fetchSuggestions(forRole: Role, cursor?: string) {
    const qs = new URLSearchParams({ for: forRole });
    if (cursor) qs.set('cursor', cursor);
    // opzionale: qs.set('limit', '4');
    const res = await fetch(`/api/follows/suggestions?${qs.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return { items: [] as Suggestion[], nextCursor: null as string | null };
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? (data.items as Suggestion[]) : [];
    const nextCursor = typeof data?.nextCursor === 'string' ? data.nextCursor : null;
    return { items, nextCursor };
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { items: more, nextCursor: nc } = await fetchSuggestions(role, nextCursor);
      // merge dedup per id
      setItems((prev) => {
        const byId = new Map(prev.map((x) => [x.id, x]));
        for (const it of more) if (!byId.has(it.id)) byId.set(it.id, it);
        return Array.from(byId.values());
      });
      setNextCursor(nc);
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleFollow(id: string) {
    setPendingId(id);
    const wasFollowing = following.has(id);
    const prev = new Set(following);
    const next = new Set(following);

    if (wasFollowing) next.delete(id);
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
      if (Array.isArray(out?.ids)) setFollowing(new Set(out.ids));
    } catch {
      setFollowing(prev); // rollback
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

  const followedItems = items.filter((it) => following.has(it.id));
  const suggestedItems = items.filter((it) => !following.has(it.id));

  return (
    <aside className="rounded-2xl border bg-white/60 p-4 shadow-sm dark:bg-zinc-900/60">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        {role === 'club' ? 'Atleti suggeriti' : role === 'athlete' ? 'Club da seguire' : 'Chi seguire'}
      </h3>

      {followedItems.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Profili che segui già
          </div>
          <ul className="space-y-2">
            {followedItems.map((it) => {
              const isPending = pendingId === it.id;
              return (
                <li key={`followed-${it.id}`} className="flex items-center gap-3 text-sm">
                  <img
                    src={
                      it.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(it.name)}`
                    }
                    alt={it.name}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.name}</div>
                    <div className="truncate text-xs text-zinc-500">
                      @{it.handle}
                      {it.city ? ` · ${it.city}` : ''}
                      {it.sport ? ` · ${it.sport}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFollow(it.id)}
                    disabled={isPending}
                    aria-busy={isPending}
                    className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    {isPending ? '...' : 'Smetti di seguire'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {suggestedItems.length > 0 ? (
        <>
          <ul className="space-y-3">
            {suggestedItems.map((it) => {
              const isPending = pendingId === it.id;
              const isFollowing = following.has(it.id);
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
                    aria-busy={isPending}
                    className={[
                      'rounded-xl border px-3 py-1.5 text-sm font-semibold transition',
                      'hover:bg-zinc-50 dark:hover:bg-zinc-800',
                      isPending ? 'opacity-70' : '',
                    ].join(' ')}
                  >
                    {isPending ? '...' : isFollowing ? 'Segui già' : 'Segui'}
                  </button>
                </li>
              );
            })}
          </ul>

          {nextCursor && (
            <div className="mt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {loadingMore ? 'Carico…' : 'Mostra altri'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Hai già seguito tutti i profili suggeriti.
          {nextCursor ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {loadingMore ? 'Carico…' : 'Mostra altri suggerimenti'}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <a
                href="/search/club"
                className="text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-200"
              >
                Cerca manualmente un club
              </a>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}