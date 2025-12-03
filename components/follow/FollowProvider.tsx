'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchFollowState, toggleFollow } from '@/lib/services/follow';

export type FollowContextValue = {
  isFollowing: (targetProfileId: string) => boolean;
  toggleFollow: (targetProfileId: string) => Promise<void>;
  ensureState: (targetProfileIds: string[]) => Promise<void>;
  pending: Set<string>;
  currentProfileId: string | null;
};

const FollowContext = createContext<FollowContextValue | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  const isFollowing = useCallback(
    (targetProfileId: string) => followed.has(targetProfileId),
    [followed]
  );

  const ensureState = useCallback(async (targetProfileIds: string[]) => {
    const unknown = targetProfileIds.filter((id) => !followed.has(id));
    if (!unknown.length) return;
    try {
      const state = await fetchFollowState(unknown);
      setFollowed((prev) => {
        const next = new Set(prev);
        Object.entries(state).forEach(([id, value]) => {
          if (value) next.add(id);
          else next.delete(id);
        });
        return next;
      });
    } catch (error) {
      console.error('[follow-provider] ensure state error', error);
    }
  }, [followed]);

  const toggle = useCallback(async (targetProfileId: string) => {
    const target = (targetProfileId || '').trim();
    if (!target) return;
    setPending((prev) => new Set(prev).add(target));
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
    try {
      const res = await toggleFollow(target);
      setFollowed((prev) => {
        const next = new Set(prev);
        if (res.isFollowing) next.add(target);
        else next.delete(target);
        return next;
      });
    } catch (error) {
      console.error('[follow-provider] toggle error', error);
      setFollowed((prev) => {
        const next = new Set(prev);
        if (next.has(target)) next.delete(target);
        else next.add(target);
        return next;
      });
      throw error;
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(target);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        const meId = (json as any)?.data?.id as string | null | undefined;
        setCurrentProfileId(meId ?? null);
      } catch {
        if (active) setCurrentProfileId(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<FollowContextValue>(() => ({
    isFollowing,
    toggleFollow: toggle,
    ensureState,
    pending,
    currentProfileId,
  }), [ensureState, isFollowing, pending, toggle, currentProfileId]);

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow(): FollowContextValue {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollow deve essere usato dentro FollowProvider');
  return ctx;
}
