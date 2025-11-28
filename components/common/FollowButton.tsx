'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

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

function normalizeTargetType(targetType: FollowButtonProps['targetType']) {
  return targetType === 'club' ? 'club' : 'player';
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
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [pending, setPending] = useState(false);

  const normalizedTargetType = useMemo(() => normalizeTargetType(targetType), [targetType]);

  useEffect(() => {
    setIsFollowing(initialIsFollowing ?? false);
  }, [initialIsFollowing, targetId]);

  useEffect(() => {
    if (!targetId || initialIsFollowing !== undefined) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: user } = await supabase.auth.getUser();
        const uid = user?.user?.id;
        if (!uid) return;

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', uid)
          .eq('target_id', targetId)
          .eq('target_type', normalizedTargetType)
          .maybeSingle();

        if (!cancelled) {
          setIsFollowing(!!data);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetId, normalizedTargetType, initialIsFollowing]);

  async function handleToggle() {
    if (!targetId || pending) return;
    setPending(true);
    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const supabase = supabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id;
      if (!uid) throw new Error('not_authenticated');

      if (prev) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', uid)
          .eq('target_id', targetId)
          .eq('target_type', normalizedTargetType);
      } else {
        await supabase.from('follows').upsert({
          follower_id: uid,
          target_id: targetId,
          target_type: normalizedTargetType,
        });
      }

      onChange?.(!prev);
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('not_authenticated')) {
        alert('Accedi per gestire i profili che segui.');
      }
      setIsFollowing(prev);
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
