'use client';

import { useEffect, useMemo, useState } from 'react';

export const LS_FOLLOW_KEY = 'followed_club_ids_v1';

type Props = {
  /** Compat: puoi passare id o clubId */
  id?: string | number;
  clubId?: string | number;

  /** Facoltativo: nome visuale, compat sia name che clubName */
  name?: string;
  clubName?: string;

  /** Etichette */
  labelFollow?: string;
  labelFollowing?: string;

  /** Dimensione opzionale (usata in alcune tabelle) */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  className?: string;
  children?: React.ReactNode;
};

export default function FollowButton({
  id,
  clubId,
  name,
  clubName,
  labelFollow = 'Segui',
  labelFollowing = 'Seguito ✓',
  size = 'sm',
  className,
  children,
}: Props) {
  const effectiveId = useMemo(() => {
    const v = (id ?? clubId);
    return v != null ? String(v) : '';
  }, [id, clubId]);

  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  // classi dimensioni
  const sizeCls = size === 'xs'
    ? 'px-2 py-1 text-xs'
    : size === 'sm'
    ? 'px-3 py-1.5 text-sm'
    : size === 'md'
    ? 'px-3.5 py-2 text-sm'
    : 'px-4 py-2.5 text-base';

  // carica stato iniziale (ids seguiti) da API + sync con localStorage
  useEffect(() => {
    if (!effectiveId) return;
    (async () => {
      try {
        const r = await fetch('/api/follows/toggle', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const ids: string[] = Array.isArray(j?.ids) ? j.ids.map(String) : [];
        setFollowing(ids.includes(effectiveId));
        try {
          localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
        } catch {}
      } catch {
        // ignora errori iniziali
      }
    })();
  }, [effectiveId]);

  async function toggle() {
    if (!effectiveId) return;
    setPending(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const r = await fetch('/api/follows/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: effectiveId }),
      });
      if (!r.ok) throw new Error('toggle failed');
      const j = await r.json().catch(() => ({}));
      const ids: string[] = Array.isArray(j?.ids) ? j.ids.map(String) : [];
      setFollowing(ids.includes(effectiveId));
      try {
        localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
      } catch {}
    } catch {
      // rollback UI
      setFollowing(prev);
    } finally {
      setPending(false);
    }
  }

  const baseBtn =
    `inline-flex items-center justify-center rounded-xl border font-semibold transition
     hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800 ${sizeCls}`;

  const displayName = clubName ?? name ?? '';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !effectiveId}
      aria-busy={pending}
      aria-pressed={following}
      className={[baseBtn, following ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : '', className || ''].join(' ').trim()}
      title={following ? labelFollowing : labelFollow}
    >
      {children ?? (pending ? '...' : (following ? labelFollowing : labelFollow))}
      {displayName ? <span className="sr-only"> {displayName}</span> : null}
    </button>
  );
}
