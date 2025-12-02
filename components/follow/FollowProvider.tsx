'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchFollowState, toggleFollow as toggleFollowService } from '@/lib/services/follow';

export type FollowTargetType = 'club' | 'athlete' | 'player';

type FollowContextValue = {
  profileId: string | null;
  following: Set<string>;
  followers: Set<string>;
  loading: boolean;
  error: string | null;
  isFollowing: (targetId?: string | null) => boolean;
  isPending: (targetId?: string | null) => boolean;
  toggleFollow: (targetId: string, targetType: FollowTargetType) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const FollowContext = createContext<FollowContextValue | undefined>(undefined);

function normalizeTargetType(targetType: FollowTargetType): 'club' | 'player' {
  return targetType === 'club' ? 'club' : 'player';
}

export function FollowProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followers, setFollowers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTargets, setPendingTargets] = useState<Set<string>>(new Set());

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[follow-provider] loading follow state');
      const state = await fetchFollowState();
      setProfileId(state.profileId ?? null);
      setFollowing(new Set((state.followingIds ?? []).filter(Boolean)));
      setFollowers(new Set((state.followerIds ?? []).filter(Boolean)));
      console.log('[follow-provider] state loaded', {
        profileId: state.profileId,
        followingCount: state.followingIds?.length ?? 0,
        followerCount: state.followerIds?.length ?? 0,
      });
    } catch (err: any) {
      console.error('[follow-provider] load error', err);
      setError(err?.message || 'Impossibile caricare i follow');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const isFollowing = useCallback(
    (targetId?: string | null) => (targetId ? following.has(targetId) : false),
    [following],
  );

  const isPending = useCallback(
    (targetId?: string | null) => (targetId ? pendingTargets.has(targetId) : false),
    [pendingTargets],
  );

  const toggleFollow = useCallback(
    async (targetId: string, targetType: FollowTargetType) => {
      if (!targetId) return false;
      const normalizedType = normalizeTargetType(targetType);
      console.log('[follow-provider] toggle start', { targetId, targetType: normalizedType });

      setPendingTargets((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });

      let previousFollowing = false;
      setFollowing((prev) => {
        previousFollowing = prev.has(targetId);
        const next = new Set(prev);
        if (previousFollowing) {
          next.delete(targetId);
        } else {
          next.add(targetId);
        }
        return next;
      });

      try {
        const res = await toggleFollowService(targetId, normalizedType);
        const resolvedTargetId = res.targetId || targetId;
        const final = Boolean(res.isFollowing);
        console.log('[follow-provider] toggle success', { targetId: resolvedTargetId, isFollowing: final });

        setFollowing((prev) => {
          const next = new Set(prev);
          if (final) {
            next.add(resolvedTargetId);
          } else {
            next.delete(resolvedTargetId);
          }
          return next;
        });

        return final;
      } catch (err: any) {
        console.error('[follow-provider] toggle error', err);
        setError(err?.message || 'Impossibile aggiornare il follow');
        setFollowing((prev) => {
          const next = new Set(prev);
          if (previousFollowing) {
            next.add(targetId);
          } else {
            next.delete(targetId);
          }
          return next;
        });
        throw err;
      } finally {
        setPendingTargets((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    },
    [],
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      profileId,
      following,
      followers,
      loading,
      error,
      isFollowing,
      isPending,
      toggleFollow,
      refresh: loadState,
    }),
    [profileId, following, followers, loading, error, isFollowing, isPending, toggleFollow, loadState],
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow(): FollowContextValue {
  const ctx = useContext(FollowContext);
  if (!ctx) {
    throw new Error('useFollow deve essere usato dentro un FollowProvider');
  }
  return ctx;
}
