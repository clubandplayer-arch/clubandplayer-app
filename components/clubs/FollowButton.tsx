'use client';

import { useEffect, useState } from 'react';

/** Chiavi di compatibilità con componenti esistenti */
export const LS_FOLLOW_KEY = 'followed_club_ids_v1';

type Props = {
  id: string;                 // clubId richiesto
  labelFollow?: string;       // testo pulsante "Segui"
  labelFollowing?: string;    // testo stato "Seguito"
  className?: string;
  children?: React.ReactNode; // se passato, sovrascrive le label
};

/**
 * FollowButton minimale che usa /api/follows/toggle
 * e mantiene una copia degli ID in localStorage[LS_FOLLOW_KEY]
 */
export default function FollowButton({
  id,
  labelFollow = 'Segui',
  labelFollowing = 'Seguito ✓',
  className,
  children,
}: Props) {
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/follows/toggle', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const ids: string[] = Array.isArray(j?.ids) ? j.ids : [];
        setFollowing(ids.includes(id));
        // sync localStorage per compatibilità
        try {
          localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
        } catch {}
      } catch {
        // ignore
      }
    })();
  }, [id]);

  async function toggle() {
    setPending(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const r = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error('toggle failed');
      const j = await r.json().catch(() => ({}));
      const ids: string[] = Array.isArray(j?.ids) ? j.ids : [];
      setFollowing(ids.includes(id));
      try {
        localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
      } catch {}
    } catch {
      setFollowing(prev); // rollback
    } finally {
      setPending(false);
    }
  }

  const base =
    'rounded-xl border px-3 py-1.5 text-sm font-semibold transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800';

  return !following ? (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-busy={pending}
      className={[base, className || ''].join(' ')}
      title={labelFollow}
    >
      {children ?? (pending ? '...' : labelFollow)}
    </button>
  ) : (
    <span
      className={[
        'inline-flex items-center rounded-xl border bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900',
        className || '',
      ].join(' ')}
      title={labelFollowing}
      aria-live="polite"
    >
      {children ?? (pending ? '...' : labelFollowing)}
    </span>
  );
}
