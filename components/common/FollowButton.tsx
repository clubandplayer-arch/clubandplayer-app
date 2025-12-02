'use client';

import { useMemo } from 'react';
import { useToast } from './ToastProvider';
import { useFollow } from '@/components/follow/FollowProvider';

export type FollowButtonProps = {
  targetId: string;
  targetType: 'club' | 'athlete' | 'player';
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
  targetName,
  size = 'sm',
  className,
  labelFollow = 'Segui',
  labelFollowing = 'Seguo',
  onChange,
}: FollowButtonProps) {
  const toast = useToast();
  const { isFollowing, toggleFollow, isPending } = useFollow();
  const normalizedType = useMemo(() => normalizeType(targetType), [targetType]);

  async function handleToggle() {
    if (!targetId || isPending(targetId)) return;

    try {
      console.log('[follow] click', { targetId, targetType: normalizedType, isFollowing: isFollowing(targetId) });
      const next = await toggleFollow(targetId, normalizedType);
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
    }
  }

  const sizeCls = size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-3 py-1.5 text-sm';
  const following = isFollowing(targetId);
  const pending = isPending(targetId);

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending || !targetId}
      aria-busy={pending}
      aria-pressed={following}
      className={[
        'inline-flex items-center justify-center rounded-xl border font-semibold transition',
        'hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800',
        following ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : '',
        sizeCls,
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {pending ? '...' : following ? labelFollowing : labelFollow}
      {targetName ? <span className="sr-only"> {targetName}</span> : null}
    </button>
  );
}