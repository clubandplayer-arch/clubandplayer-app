'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import NotificationItem from './NotificationItem';
import type { NotificationWithActor } from '@/types/notifications';
import { useToast } from '@/components/common/ToastProvider';

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
};

export default function NotificationsDropdown({ unreadCount, onUnreadChange }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useOutsideClick(containerRef, () => setOpen(false));

  useEffect(() => {
    if (!open || items.length > 0 || loading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/notifications?limit=10', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error || 'Errore nel caricamento');
        setItems(json?.data ?? []);
        if (unreadCount > 0) {
          await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true }),
          });
          onUnreadChange(0);
          window.dispatchEvent(new Event('app:notifications-updated'));
        }
      } catch (e: any) {
        toast({ title: 'Errore notifiche', description: e?.message || 'Impossibile caricare le notifiche', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items.length, loading, unreadCount, onUnreadChange, toast]);

  const badge = unreadCount > 0 && (
    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-[11px] font-semibold text-white">
      {unreadCount}
    </span>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
            ) : items.length > 0 ? (
              <div className="space-y-2">
                {items.map((n) => (
                  <NotificationItem key={n.id} notification={n} compact onClick={() => setOpen(false)} />
                ))}
              </div>
            ) : (
              <div className="p-3 text-sm text-neutral-500">Nessuna notifica recente</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
