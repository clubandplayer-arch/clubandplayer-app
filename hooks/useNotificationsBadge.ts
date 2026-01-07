'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useNotificationsBadge(pollIntervalMs = 45000) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Errore caricamento badge notifiche');
      if (!cancelledRef.current) setUnreadCount(Number(json?.count) || 0);
    } catch (error) {
      console.error('[notifications] unread-count poll failed', { error });
      if (!cancelledRef.current) setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    const handleUpdate = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void refresh();
    };

    void refresh();

    if (pollIntervalMs > 0) {
      timerRef.current = setInterval(() => void refresh(), pollIntervalMs);
    }

    window.addEventListener('app:notifications-updated', handleUpdate);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('app:notifications-updated', handleUpdate);
    };
  }, [pollIntervalMs, refresh]);

  return { unreadCount, setUnreadCount, refresh } as const;
}
