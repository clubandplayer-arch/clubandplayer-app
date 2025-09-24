'use client';

import { useEffect, useRef, useState } from 'react';

type Athlete = {
  id: string;
  handle: string;
  name: string;
  age?: number;
  position?: string;
  city?: string;
  sport?: string;
  avatarUrl?: string;
  coverUrl?: string;
  about?: string;
  followers?: number;
};

const UNDO_MS = 1200;

export default function AthleteHeader({ handle }: { handle: string }) {
  const [ath, setAth] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const r = await fetch(`/api/athletes/${encodeURIComponent(handle)}`, { cache: 'no-store' });
        const dj = await r.json().catch(() => ({}));
        if (!r.ok || !dj?.athlete) throw new Error(dj?.error || 'Errore caricamento atleta');
        setAth(dj.athlete);

        const gf = await fetch('/api/follows/toggle', { cache: 'no-store', credentials: 'include' });
        const fj = await gf.json().catch(() => ({}));
        const ids: string[] = Array.isArray(fj?.ids) ? fj.ids : [];
        setFollowing(ids.includes(dj.athlete.id));
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [handle]);

  async function toggleFollow(withUndo = true) {
    if (!ath) return;
    setPending(true);
    const prev = following;
    const next = !following;
    setFollowing(next);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ath.id }),
      });
      if (!res.ok) throw new Error('toggle failed');

      if (next && withUndo) {
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => {
          undoTimer.current = null;
        }, UNDO_MS);
      } else if (!next && undoTimer.current) {
        clearTimeout(undoTimer.current);
        undoTimer.current = null;
      }
    } catch {
      setFollowing(prev); // rollback
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <header className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-24 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </header>
    );
  }

  if (err || !ath) {
    return (
      <header className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-red-600">Errore: {err || 'Atleta non trovato'}</div>
      </header>
    );
  }

  const cover =
    ath.coverUrl ||
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient></defs><rect width="800" height="160" fill="url(#g)"/></svg>`,
      );

  const avatar =
    ath.avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ath.name)}`;

  return (
    <header className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />
      <div className="flex flex-wrap items-center gap-4 p-4">
        <img
          src={avatar}
          alt={ath.name}
          className="h-16 w-16 rounded-full ring-2 ring-white dark:ring-neutral-900"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold">{ath.name}</div>
          <div className="truncate text-xs text-neutral-500">
            {ath.position ? ath.position : '—'}
            {ath.age ? ` • ${ath.age} anni` : ''}
            {ath.city ? ` • ${ath.city}` : ''}
            {ath.sport ? ` • ${ath.sport}` : ''}
            {typeof ath.followers === 'number' ? ` • ${ath.followers} follower` : ''}
          </div>
        </div>

        {!following ? (
          <button
            type="button"
            onClick={() => toggleFollow(true)}
            disabled={pending}
            aria-busy={pending}
            className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {pending ? '...' : 'Segui'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-xl border bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
              {pending ? '...' : 'Seguito ✓'}
            </span>
            {undoTimer.current && (
              <button
                type="button"
                onClick={() => toggleFollow(false)}
                className="text-xs underline text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                title="Annulla"
              >
                Annulla
              </button>
            )}
          </div>
        )}
      </div>

      {ath.about && (
        <div className="border-t p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {ath.about}
        </div>
      )}
    </header>
  );
}
