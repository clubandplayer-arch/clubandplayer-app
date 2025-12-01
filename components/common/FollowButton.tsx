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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const normalizedTargetType = useMemo(() => (targetType === 'club' ? 'club' : 'player'), [targetType]);
  const targetTypeMatches = useMemo(
    () => (normalizedTargetType === 'player' ? ['player', 'athlete'] : ['club']),
    [normalizedTargetType],
  );

  useEffect(() => {
    setIsFollowing(initialIsFollowing ?? false);
  }, [initialIsFollowing, targetId]);

  useEffect(() => {
    if (!targetId) {
      setCurrentUserId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: user } = await supabase.auth.getUser();
        const uid = user?.user?.id;
        if (!uid) return;

        if (cancelled) return;
        setCurrentUserId(uid);
      } catch (err) {
        console.error('[FollowButton] errore recupero profilo', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetId) {
      setTargetUserId(null);
      return;
    }

    let cancelled = false;
    const supabase = supabaseBrowser();

    (async () => {
      try {
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('id', targetId)
          .maybeSingle();

        if (cancelled) return;
        if (profileById?.id) {
          setTargetUserId(profileById.user_id ?? profileById.id);
          return;
        }

        const { data: profileByUser } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('user_id', targetId)
          .maybeSingle();

        if (cancelled) return;
        if (profileByUser?.id && profileByUser.user_id) {
          setTargetUserId(profileByUser.user_id);
        } else {
          setTargetUserId(targetId);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[FollowButton] errore risoluzione target follow', err);
          setTargetUserId(targetId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetUserId || initialIsFollowing !== undefined || !currentUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = supabaseBrowser();

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('target_id', targetUserId)
          .in('target_type', targetTypeMatches)
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
  }, [targetUserId, targetTypeMatches, initialIsFollowing, currentUserId]);

  async function handleToggle() {
    if (!targetUserId || pending) return;
    setPending(true);
    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const supabase = supabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id;
      if (!uid) throw new Error('not_authenticated');

      setCurrentUserId(uid);

      if (prev) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', uid)
          .eq('target_id', targetUserId)
          .in('target_type', targetTypeMatches);

        if (deleteError) {
          console.error('[FollowButton] errore unfollow', deleteError);
          throw deleteError;
        }
      } else {
        const { error: insertError } = await supabase.from('follows').upsert({
          follower_id: uid,
          target_id: targetUserId,
          target_type: normalizedTargetType,
        });

        if (insertError) {
          console.error('[FollowButton] errore follow', insertError);
          throw insertError;
        }
      }

      onChange?.(!prev);
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('not_authenticated')) {
        alert('Accedi per gestire i profili che segui.');
      }
      console.error('[FollowButton] toggle fallito', err);
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
