'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFollow } from '@/components/follow/FollowProvider';

export type FollowButtonProps = {
  targetProfileId: string;
  labelFollow?: string;
  labelFollowing?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export default function FollowButton({
  targetProfileId,
  labelFollow = 'Segui',
  labelFollowing = 'Seguo',
  size = 'md',
  className,
}: FollowButtonProps) {
  const { isFollowing, toggleFollow, ensureState, pending, currentProfileId } = useFollow();
  const [initialized, setInitialized] = useState(false);

  const cleanId = useMemo(() => (targetProfileId || '').trim(), [targetProfileId]);
  const isSelf = useMemo(() => !!currentProfileId && !!cleanId && currentProfileId === cleanId, [
    cleanId,
    currentProfileId,
  ]);
  const following = cleanId ? isFollowing(cleanId) : false;
  const loading = cleanId ? pending.has(cleanId) : false;

  useEffect(() => {
    if (!cleanId || initialized || isSelf) return;
    void ensureState([cleanId]);
    setInitialized(true);
  }, [cleanId, ensureState, initialized, isSelf]);

  const label = following ? labelFollowing : labelFollow;
  const padding = size === 'sm' ? 'px-2 py-1 text-sm' : 'px-3 py-1.5 text-sm';

  const handleClick = async () => {
    if (!cleanId || loading || isSelf) return;
    try {
      await toggleFollow(cleanId);
    } catch (error) {
      console.error('[FollowButton] errore toggle', error);
    }
  };

  if (!cleanId || isSelf) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!cleanId || loading}
      className={`inline-flex items-center gap-2 rounded-md border transition ${
        following
          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
          : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
      } ${padding} ${className || ''}`}
    >
      {loading ? '...' : label}
    </button>
  );
}
