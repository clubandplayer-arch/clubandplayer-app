'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import NotificationItem from './NotificationItem';
import { useToast } from '@/components/common/ToastProvider';
import { useNotificationsList } from '@/hooks/useNotificationsList';

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, ref]);
}

type Props = {
  unreadCount: number;
  onUnreadChange: (next: number) => void;
  active?: boolean;
};

export default function NotificationsDropdown({ unreadCount, onUnreadChange, active }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { items, loading, error } = useNotificationsList({ limit: 10, enabled: open });

  useOutsideClick(containerRef, () => setOpen(false));

  useEffect(() => {
    if (!open || loading || error || unreadCount <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const markRes = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
        if (!markRes.ok) {
          const errJson = await markRes.json().catch(() => ({}));
          throw new Error(errJson?.error || 'Impossibile segnare le notifiche');
        }
        if (cancelled) return;
        onUnreadChange(0);
        window.dispatchEvent(new Event('app:notifications-updated'));
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[notifications] dropdown mark-all-read error', err);
        }
        toast({
          title: 'Errore notifiche',
          description: 'Impossibile segnare le notifiche',
          variant: 'destructive',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loading, error, unreadCount, onUnreadChange, toast]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: 'Errore notifiche',
      description: 'Errore nel caricamento notifiche',
      variant: 'destructive',
    });
  }, [error, toast]);

  const badge = unreadCount > 0 && (
    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-[11px] font-semibold text-white">
      {unreadCount}
    </span>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          active ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Notifiche"
      >
        <MaterialIcon name="notifications" fontSize="small" />
        {badge}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-xl border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold">Notifiche</div>
            <Link href="/notifications" className="text-sm text-[var(--brand)] hover:underline">
              Vedi tutte
            </Link>
          </div>
          <div className="max-h-[420px] overflow-auto p-3">
            {loading ? (
              <div className="p-3 text-sm text-neutral-500">Caricamento…</div>
            ) : error ? (
              <div className="p-3 text-sm text-red-500">{error}</div>
            ) : items.length > 0 ? (
              <div className="space-y-2">
                {items.map((n) => (
                  <NotificationItem key={n.id} notification={n} compact onClick={() => setOpen(false)} />
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-neutral-500">Nessuna notifica</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
