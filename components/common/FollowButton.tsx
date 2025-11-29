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
  return targetType === 'club' ? 'club' : 'athlete';
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
  const [profileId, setProfileId] = useState<string | null>(null);

  const normalizedTargetType = useMemo(() => normalizeTargetType(targetType), [targetType]);

  useEffect(() => {
    setIsFollowing(initialIsFollowing ?? false);
  }, [initialIsFollowing, targetId]);

  useEffect(() => {
    if (!targetId) return;

    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: user } = await supabase.auth.getUser();
        const uid = user?.user?.id;
        if (!uid) return;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle();

        if (profileError) {
          console.error('[FollowButton] errore profilo corrente', profileError);
          return;
        }

        if (cancelled) return;
        setProfileId(profile?.id ?? null);
      } catch (err) {
        console.error('[FollowButton] errore recupero profilo', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetId || initialIsFollowing !== undefined || !profileId) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = supabaseBrowser();

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', profileId)
          .eq('target_id', targetId)
          .in('target_type', [normalizedTargetType, 'player'])
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
  }, [targetId, normalizedTargetType, initialIsFollowing, profileId]);

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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle();

      if (profileError) {
        console.error('[FollowButton] errore recupero profilo corrente', profileError);
        throw profileError;
      }

      const currentProfileId = profile?.id;
      if (!currentProfileId) {
        throw new Error('missing_profile');
      }

      setProfileId(currentProfileId);

      if (prev) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentProfileId)
          .eq('target_id', targetId)
          .in('target_type', [normalizedTargetType, 'player']);

        if (deleteError) {
          console.error('[FollowButton] errore unfollow', deleteError);
          throw deleteError;
        }
      } else {
        const { error: insertError } = await supabase.from('follows').upsert({
          follower_id: currentProfileId,
          target_id: targetId,
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
      } else if (message.includes('missing_profile')) {
        alert('Completa il tuo profilo per seguire altri utenti.');
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
