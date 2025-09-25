'use client';

import { useEffect, useRef, useState } from 'react';

type Club = {
  id: string;
  slug: string;
  name: string;
  city?: string;
  sport?: string;
  avatarUrl?: string;
  coverUrl?: string;
  about?: string;
  followers?: number;
};

const UNDO_MS = 1200;

export default function ClubHeader({ slug }: { slug: string }) {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [following, setFollowing] = useState<boolean>(false);
  const [pending, setPending] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // club data
        const r = await fetch(`/api/clubs/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const dj = await r.json().catch(() => ({}));
        if (!r.ok || !dj?.club) throw new Error(dj?.error || 'Errore caricamento club');
        setClub(dj.club);

        // follow state
        const gf = await fetch('/api/follows/toggle', {
          cache: 'no-store',
          credentials: 'include',
        });
        const fj = await gf.json().catch(() => ({}));
        const ids: string[] = Array.isArray(fj?.ids) ? fj.ids : [];
        setFollowing(ids.includes(dj.club.id));
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [slug]);

  async function toggleFollow(withUndo = true) {
    if (!club) return;
    setPending(true);
    const prev = following;
    const next = !following;
    setFollowing(next);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: club.id }),
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

  if (err || !club) {
    return (
      <header className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-red-600">Errore: {err || 'Club non trovato'}</div>
      </header>
    );
  }

  const cover =
    club.coverUrl ||
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><rect width="800" height="160" fill="url(#g)"/></svg>`,
      );

  const avatar =
    club.avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(club.name)}`;

  return (
    <header className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div
        className="h-32 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${cover})` }}
      />
      <div className="flex flex-wrap items-center gap-4 p-4">
        <img
          src={avatar}
          alt={club.name}
          className="h-16 w-16 rounded-full ring-2 ring-white dark:ring-neutral-900"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold">{club.name}</div>
          <div className="truncate text-xs text-neutral-500">
            {club.city ? club.city : '—'} {club.sport ? `• ${club.sport}` : ''}
            {typeof club.followers === 'number' ? ` • ${club.followers} follower` : ''}
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
                className="text-xs text-neutral-500 underline hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                title="Annulla"
              >
                Annulla
              </button>
            )}
          </div>
        )}
      </div>

      {club.about && (
        <div className="border-t p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
          {club.about}
        </div>
      )}
    </header>
  );
}
