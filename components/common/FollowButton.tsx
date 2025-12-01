'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastProvider';
import { useFollowState } from '@/hooks/useFollowState';

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
  const { markFollowing } = useFollowState();
  const normalizedType = useMemo(() => normalizeType(targetType), [targetType]);
  const [isFollowing, setIsFollowing] = useState(Boolean(initialIsFollowing));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setIsFollowing(Boolean(initialIsFollowing));
  }, [initialIsFollowing, targetId]);

  async function handleToggle() {
    if (!targetId || pending) return;
    setPending(true);

    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId, targetType: normalizedType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Operazione non riuscita');
      }

      const next = Boolean(data.isFollowing);
      const resolvedTargetId = typeof data?.targetId === 'string' ? data.targetId : targetId;
      setIsFollowing(next);
      markFollowing?.(resolvedTargetId, next);
      onChange?.(next);
      toast?.success(
        next
          ? 'Ora stai seguendo il profilo'
          : 'Hai smesso di seguire il profilo',
      );
    } catch (err: any) {
      console.error('[FollowButton] toggle fallito', err);
      toast?.error(
        err?.message || 'Impossibile aggiornare il follow. Riprova più tardi.',
      );
    } finally {
      setPending(false);
    }
  }

  const sizeCls = size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-3 py-1.5 text-sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending || !targetId}
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
