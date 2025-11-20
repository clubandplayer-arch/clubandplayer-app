'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const LS_FOLLOW_KEY = 'followed_club_ids_v1';

type Props = {
  /** Compat: puoi passare id o clubId */
  id?: string | number;
  clubId?: string | number;

  /** Tipo di target (club o player) */
  targetType?: 'club' | 'player';

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
  targetType = 'club',
  labelFollow = 'Segui',
  labelFollowing = 'Seguito ✓',
  size = 'sm',
  className,
  children,
}: Props) {
  const effectiveId = useMemo(() => {
    const v = id ?? clubId;
    return v != null ? String(v) : '';
  }, [id, clubId]);

  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  // classi dimensioni
  const sizeCls =
    size === 'xs'
      ? 'px-2 py-1 text-xs'
      : size === 'sm'
      ? 'px-3 py-1.5 text-sm'
      : size === 'md'
      ? 'px-3.5 py-2 text-sm'
      : 'px-4 py-2.5 text-base';

  // carica stato iniziale da Supabase
  useEffect(() => {
    if (!effectiveId) return;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: user } = await supabase.auth.getUser();
        const uid = user?.user?.id;
        if (!uid) return;
        const { data, error } = await supabase
          .from('follows')
          .select('target_id, target_type')
          .eq('follower_id', uid)
          .eq('target_type', targetType)
          .limit(200);
        if (error) return;
        const ids: string[] = Array.isArray(data) ? data.map((d) => String(d.target_id)) : [];
        setFollowing(ids.includes(effectiveId));
        try {
          localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
        } catch (_e) {
          // ignore quota/unavailable
        }
      } catch (_e) {
        // ignora errori iniziali (rimaniamo su false)
      }
    })();
  }, [effectiveId, targetType]);

  async function toggle() {
    if (!effectiveId) return;
    setPending(true);
    const prev = following;
    setFollowing(!prev);
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
          .eq('target_id', effectiveId)
          .eq('target_type', targetType);
      } else {
        await supabase.from('follows').upsert({
          follower_id: uid,
          target_id: effectiveId,
          target_type: targetType,
        });
      }

      const { data } = await supabase
        .from('follows')
        .select('target_id')
        .eq('follower_id', uid)
        .eq('target_type', targetType);
      const ids: string[] = Array.isArray(data) ? data.map((d) => String(d.target_id)) : [];
      setFollowing(ids.includes(effectiveId));
      try {
        localStorage.setItem(LS_FOLLOW_KEY, JSON.stringify(ids));
      } catch (_e) {
        // ignore quota/unavailable
      }
    } catch (_e) {
      // rollback UI
      setFollowing(prev);
    } finally {
      setPending(false);
    }
  }

  const baseBtn = [
    'inline-flex items-center justify-center rounded-xl border font-semibold transition',
    'hover:bg-neutral-50 disabled:opacity-60',
    'dark:border-neutral-700 dark:hover:bg-neutral-800',
    sizeCls,
  ].join(' ');

  const displayName = clubName ?? name ?? '';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !effectiveId}
      aria-busy={pending}
      aria-pressed={following}
      className={[
        baseBtn,
        following ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : '',
        className || '',
      ]
        .join(' ')
        .trim()}
      title={following ? labelFollowing : labelFollow}
    >
      {children ?? (pending ? '...' : following ? labelFollowing : labelFollow)}
      {displayName ? <span className="sr-only"> {displayName}</span> : null}
    </button>
  );
}