'use client';

import { useEffect, useRef, useState } from 'react';

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

const TARGET_VISIBLE = 4; // mantieni ~4 suggerimenti in vista, come su LinkedIn
const REMOVE_DELAY_MS = 1200; // finestra per "Annulla"

export default function WhoToFollow() {
  const [role, setRole] = useState<Role>('guest');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Card rimosse dall'elenco (dopo il delay)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // Timer per rimozione differita (serve per "Annulla")
  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
        const { items: firstItems, nextCursor: nc } = await fetchSuggestions(nextRole, undefined, TARGET_VISIBLE);
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

    // Cleanup timers on unmount
    return () => {
      for (const t of removeTimersRef.current.values()) clearTimeout(t);
      removeTimersRef.current.clear();
    };
  }, []);

  async function fetchSuggestions(forRole: Role, cursor?: string | null, limit?: number) {
    const qs = new URLSearchParams({ for: forRole });
    if (cursor) qs.set('cursor', cursor);
    if (limit && limit > 0) qs.set('limit', String(limit));
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

  async function loadMore(desiredCount = TARGET_VISIBLE) {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const visibleCount = getVisibleItems().length;
      const need = Math.max(desiredCount - visibleCount, 1);
      const { items: more, nextCursor: nc } = await fetchSuggestions(role, nextCursor, need);
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

  function scheduleRemoval(id: string) {
    if (removeTimersRef.current.has(id)) return; // già in programma
    const t = setTimeout(() => {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      removeTimersRef.current.delete(id);
      // top-up per mantenere il target
      topUpToTarget();
    }, REMOVE_DELAY_MS);
    removeTimersRef.current.set(id, t);
  }

  function cancelRemoval(id: string) {
    const t = removeTimersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      removeTimersRef.current.delete(id);
    }
    setRemovedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function topUpToTarget() {
    const visible = getVisibleItems().length;
    if (visible < TARGET_VISIBLE && nextCursor) {
      await loadMore(TARGET_VISIBLE);
    }
  }

  function getVisibleItems() {
    return items.filter((it) => !removedIds.has(it.id));
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

      // Se adesso è "seguito", programma la rimozione per fare refill
      const nowFollowing = !wasFollowing;
      if (nowFollowing) {
        scheduleRemoval(id);
      } else {
        // caso "Annulla" o "smisegui": annulla eventuale rimozione programmata e ripristina card
        cancelRemoval(id);
      }
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
          {Array.from({ length: TARGET_VISIBLE }).map((_, i) => (
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

  const visibleItems = getVisibleItems();

  return (
    <aside className="rounded-2xl border bg-white/60 p-4 shadow-sm dark:bg-zinc-900/60">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        {role === 'club' ? 'Atleti suggeriti' : role === 'athlete' ? 'Club da seguire' : 'Chi seguire'}
      </h3>

      {visibleItems.length > 0 ? (
        <>
          <ul className="space-y-3">
            {visibleItems.map((it) => {
              const isFollowing = following.has(it.id);
              const isPending = pendingId === it.id;
              const hasRemovalTimer = removeTimersRef.current.has(it.id);

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

                  {/* Azione stile LinkedIn: Segui → Seguito + Annulla per breve finestra */}
                  {!isFollowing ? (
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
                      {isPending ? '...' : 'Segui'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'rounded-xl border px-3 py-1.5 text-sm font-semibold',
                          'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
                        ].join(' ')}
                      >
                        {isPending ? '...' : 'Seguito ✓'}
                      </span>
                      {/* Mostra "Annulla" solo durante la finestra di rimozione */}
                      {hasRemovalTimer && (
                        <button
                          type="button"
                          onClick={() => toggleFollow(it.id)}
                          className="text-xs underline text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          aria-label="Annulla"
                        >
                          Annulla
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Se c'è ancora nextCursor, offri "Mostra altri" (anche se il refill automatico copre i casi base) */}
          {nextCursor && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => loadMore()}
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
          Nessun altro suggerimento per ora.
          {nextCursor ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => loadMore()}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {loadingMore ? 'Carico…' : 'Mostra altri suggerimenti'}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <a href="/search/club" className="text-blue-600 hover:underline dark:text-blue-400">
                Cerca altri profili
              </a>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
