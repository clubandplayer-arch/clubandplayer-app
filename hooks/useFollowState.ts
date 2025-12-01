'use client';

import { useCallback, useEffect, useState } from 'react';

type FollowState = {
  profileId: string | null;
  following: Set<string>;
  followers: Set<string>;
  loading: boolean;
  error: string | null;
};

type ApiPayload = {
  ok?: boolean;
  profileId?: string | null;
  followingIds?: string[];
  followerIds?: string[];
  data?: string[];
  error?: string;
};

let sharedState: FollowState = {
  profileId: null,
  following: new Set<string>(),
  followers: new Set<string>(),
  loading: true,
  error: null,
};

let hasLoaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function snapshot(): FollowState {
  return {
    profileId: sharedState.profileId,
    following: new Set(sharedState.following),
    followers: new Set(sharedState.followers),
    loading: sharedState.loading,
    error: sharedState.error,
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

async function loadState() {
  if (inflight) return inflight;

  inflight = (async () => {
    sharedState = { ...sharedState, loading: true };
    notify();
    try {
      const res = await fetch('/api/follows', { credentials: 'include', cache: 'no-store' });
      const payload = (await res.json().catch(() => ({}))) as ApiPayload;
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error || 'Impossibile recuperare i follow');
      }
      const followingIds = Array.isArray(payload.followingIds)
        ? payload.followingIds
        : Array.isArray(payload.data)
        ? payload.data
        : [];
      const followerIds = Array.isArray(payload.followerIds) ? payload.followerIds : [];
      sharedState = {
        profileId: payload.profileId ?? null,
        following: new Set(followingIds.filter(Boolean).map(String)),
        followers: new Set(followerIds.filter(Boolean).map(String)),
        loading: false,
        error: null,
      };
      hasLoaded = true;
    } catch (error: any) {
      sharedState = { ...sharedState, loading: false, error: error?.message || 'Impossibile recuperare i follow' };
    } finally {
      inflight = null;
      notify();
    }
  })();

  return inflight;
}

function updateFollowing(targetId: string, next: boolean) {
  if (!targetId) return;
  const nextSet = new Set(sharedState.following);
  if (next) {
    nextSet.add(targetId);
  } else {
    nextSet.delete(targetId);
  }
  sharedState = { ...sharedState, following: nextSet };
  notify();
}

export function useFollowState() {
  const [state, setState] = useState<FollowState>(snapshot());

  useEffect(() => {
    const handler = () => setState(snapshot());
    listeners.add(handler);
    handler();
    if (!hasLoaded || sharedState.loading) {
      void loadState();
    }
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const reload = useCallback(async () => {
    hasLoaded = false;
    await loadState();
  }, []);

  const markFollowing = useCallback((targetId: string, next: boolean) => {
    updateFollowing(targetId, next);
  }, []);

  return { ...state, reload, markFollowing };
}
