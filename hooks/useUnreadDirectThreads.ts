'use client';

import { useEffect, useRef, useState } from 'react';

export function useUnreadDirectThreads(pollIntervalMs = 30000) {
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const load = async () => {
      try {
        const res = await fetch('/api/direct-messages/unread-count', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!cancelledRef.current) {
          setCount(Number(json?.unreadThreads) || 0);
        }
      } catch {
        if (!cancelledRef.current) setCount(0);
      } finally {
        if (!cancelledRef.current && pollIntervalMs > 0) {
          timerRef.current = setTimeout(load, pollIntervalMs);
        }
      }
    };

    const handleUpdate = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      void load();
    };

    void load();
    window.addEventListener('app:direct-messages-updated', handleUpdate);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('app:direct-messages-updated', handleUpdate);
    };
  }, [pollIntervalMs]);

  return count;
}
