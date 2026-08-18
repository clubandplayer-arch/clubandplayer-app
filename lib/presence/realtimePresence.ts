'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type PresenceListener = (onlineProfileIds: ReadonlySet<string>) => void;

const listeners = new Set<PresenceListener>();
let onlineProfileIds: Set<string> | null = null;
let channel: any = null;
let trackedProfileId: string | null = null;
let startPromise: Promise<void> | null = null;

function publishPresenceState() {
  if (!channel) return;
  const state = channel.presenceState() as Record<string, Array<{ profileId?: unknown }>>;
  const next = new Set<string>();
  for (const [key, presences] of Object.entries(state)) {
    if (presences.length) next.add(key);
    for (const presence of presences) {
      if (typeof presence.profileId === 'string') next.add(presence.profileId);
    }
  }
  onlineProfileIds = next;
  listeners.forEach((listener) => listener(next));
}

export function startRealtimePresence(profileId: string) {
  if (channel && trackedProfileId === profileId) return startPromise ?? Promise.resolve();
  const supabase = getSupabaseBrowserClient();
  trackedProfileId = profileId;
  onlineProfileIds = null;

  startPromise = new Promise<void>((resolve) => {
    channel = supabase.channel('app-online-presence', {
      config: { presence: { key: profileId } },
    });
    channel.on('presence', { event: 'sync' }, publishPresenceState);
    channel.on('presence', { event: 'join' }, publishPresenceState);
    channel.on('presence', { event: 'leave' }, publishPresenceState);
    channel.subscribe(async (status: string) => {
      if (status !== 'SUBSCRIBED' || !channel) return;
      await channel.track({ profileId, onlineAt: new Date().toISOString() });
      publishPresenceState();
      resolve();
    });
  });
  return startPromise;
}

export function subscribeToRealtimePresence(listener: PresenceListener) {
  listeners.add(listener);
  if (onlineProfileIds) listener(onlineProfileIds);
  return () => {
    listeners.delete(listener);
  };
}

export function stopRealtimePresence() {
  const activeChannel = channel;
  channel = null;
  trackedProfileId = null;
  onlineProfileIds = null;
  startPromise = null;
  if (activeChannel) void getSupabaseBrowserClient().removeChannel(activeChannel);
}
