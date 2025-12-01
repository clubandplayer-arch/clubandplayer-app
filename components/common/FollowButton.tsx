'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastProvider';

export type FollowButtonProps = {
  targetId: string;
  targetType: 'club' | 'athlete' | 'player';
  initialIsFollowing?: boolean;
  targetName?: string;
  size?: 'sm' | 'md';
  className?: string;
  labelFollow?: string;
  labelFollowing?: string;
  onChange?: (next: boolean) => void;
};

type NormalizedType = 'club' | 'player';

function normalizeType(raw: FollowButtonProps['targetType']): NormalizedType {
  return raw === 'club' ? 'club' : 'player';
}

export default function FollowButton({
  targetId,
  targetType,
  initialIsFollowing,
  targetName,
  size = 'sm',
  className,
  labelFollow = 'Segui',
  labelFollowing = 'Seguo',
  onChange,
}: FollowButtonProps) {
  const toast = useToast();
  const normalizedType = useMemo(() => normalizeType(targetType), [targetType]);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(initialIsFollowing !== undefined);

  useEffect(() => {
    setIsFollowing(initialIsFollowing ?? false);
    setReady(initialIsFollowing !== undefined);
  }, [initialIsFollowing, targetId]);

  useEffect(() => {
    if (!targetId || initialIsFollowing !== undefined) return;

    let cancelled = false;
    setReady(false);

    (async () => {
      try {
        const res = await fetch(
          `/api/follows/toggle?targetId=${encodeURIComponent(targetId)}&targetType=${normalizedType}`,
          { cache: 'no-store', credentials: 'include' },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(data?.error || 'Impossibile leggere lo stato del follow');
        }
        setIsFollowing(Boolean(data?.following));
      } catch (err: any) {
        if (!cancelled) {
          console.error('[FollowButton] stato non disponibile', err);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialIsFollowing, normalizedType, targetId]);

  async function handleToggle() {
    if (!targetId || pending) return;

    const previous = isFollowing;
    const desired = !previous;
    setPending(true);
    setIsFollowing(desired);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId, targetType: normalizedType, action: desired ? 'follow' : 'unfollow' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Operazione non riuscita');
      }
      const next = Boolean(data.following);
      setIsFollowing(next);
      onChange?.(next);
      toast?.success?.(next ? 'Ora segui questo profilo' : 'Hai smesso di seguire');
    } catch (err: any) {
      console.error('[FollowButton] toggle fallito', err);
      setIsFollowing(previous);
      const msg = err?.message || 'Operazione non riuscita. Riprova.';
      toast?.error?.(msg);
      if (/not active|unauthorized|profilo non attivo/i.test(msg)) {
        alert('Accedi con un profilo attivo per gestire i follow.');
      }
    } finally {
      setPending(false);
    }
  }

  const sizeCls = size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-3 py-1.5 text-sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending || !targetId || !ready}
      aria-busy={pending}
      aria-pressed={isFollowing}
      className={[
        'inline-flex items-center justify-center rounded-xl border font-semibold transition',
        'hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800',
        isFollowing ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : '',
        sizeCls,
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {pending ? '...' : isFollowing ? labelFollowing : labelFollow}
      {targetName ? <span className="sr-only"> {targetName}</span> : null}
    </button>
  );
}
