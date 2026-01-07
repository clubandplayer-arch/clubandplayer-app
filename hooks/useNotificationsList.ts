import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationWithActor } from '@/types/notifications';

export type NotificationsFilter = 'all' | 'unread';

type Options = {
  limit?: number;
  filter?: NotificationsFilter;
  enabled?: boolean;
};

export function useNotificationsList({ limit = 50, filter = 'all', enabled = true }: Options) {
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications?limit=${limit}${filter === 'unread' ? '&unread=true' : ''}`, {
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Errore nel caricamento notifiche');
      }
      if (requestIdRef.current !== requestId) return;
      setItems(json?.data ?? []);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      if (process.env.NODE_ENV !== 'production') {
        console.error('[notifications] load error', err);
      }
      setItems([]);
      setError('Errore nel caricamento notifiche');
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [filter, limit]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return {
    items,
    loading,
    error,
    reload: load,
  };
}
