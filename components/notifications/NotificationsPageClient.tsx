'use client';

import { useEffect, useState } from 'react';
import NotificationItem from './NotificationItem';
import { useToast } from '@/components/common/ToastProvider';
import { useNotificationsList } from '@/hooks/useNotificationsList';

export default function NotificationsPageClient() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { toast } = useToast();
  const { items, loading, error, reload } = useNotificationsList({ limit: 50, filter, enabled: true });

  useEffect(() => {
    if (!error) return;
    toast({ title: 'Errore', description: 'Errore nel caricamento notifiche', variant: 'destructive' });
  }, [error, toast]);

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Errore nel marcare le notifiche come lette');
      }
      window.dispatchEvent(new Event('app:notifications-updated'));
      reload();
    } catch (e: any) {
      toast({ title: 'Errore', description: e?.message || 'Impossibile aggiornare le notifiche', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifiche</h1>
          <p className="text-sm text-neutral-500">Centro notifiche stile LinkedIn</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === 'all' ? 'bg-neutral-900 text-white' : 'border'}`}
          >
            Tutte
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === 'unread' ? 'bg-neutral-900 text-white' : 'border'}`}
          >
            Non lette
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Segna tutte come lette
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border p-6 text-sm text-neutral-500">Caricamento…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-sm text-neutral-500">Nessuna notifica</div>
      )}
    </div>
  );
}
