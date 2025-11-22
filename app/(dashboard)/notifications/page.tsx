'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const kindLabels: Record<string, string> = {
  follow: 'Nuovo follower',
  dm: 'Messaggio diretto',
  new_post: 'Nuovo post',
};

type NotificationRow = {
  id: string;
  user_id?: string;
  kind?: string | null;
  payload?: any;
  read_at?: string | null;
  read?: boolean | null;
  created_at?: string;
};

function iconFor(kind?: string | null) {
  switch (kind) {
    case 'dm':
      return '✉️';
    case 'follow':
      return '🤝';
    case 'new_post':
      return '📣';
    default:
      return '🔔';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isMissingKindColumn(err: unknown) {
  const message = (err as any)?.message?.toString?.() || '';
  return /notifications\.kind/.test(message) && /does not exist/i.test(message);
}

function isMissingPayloadColumn(err: unknown) {
  const message = (err as any)?.message?.toString?.() || '';
  return /notifications\.payload/.test(message) && /does not exist/i.test(message);
}

export default function NotificationsPage() {
  const supabase = supabaseBrowser();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKind, setMissingKind] = useState(false);
  const [missingPayload, setMissingPayload] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const alreadyLoaded = hasLoadedRef.current;
    setLoading((prev) => prev && !alreadyLoaded);
    setRefreshing(false);
    setError(null);
    const { data: userRes, error: authError } = await supabase.auth.getUser();
    if (authError || !userRes?.user) {
      setError('Devi accedere per vedere le notifiche.');
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
      hasLoadedRef.current = true;
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, kind, payload, read_at, read, created_at')
        .eq('user_id', userRes.user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setNotifications((data || []) as NotificationRow[]);
      setMissingKind(false);
      setMissingPayload(false);
    } catch (err: any) {
      setMissingKind(isMissingKindColumn(err));
      setMissingPayload(isMissingPayloadColumn(err));
      setError(err?.message || 'Errore nel caricare le notifiche');
      setNotifications([]);
    } finally {
      hasLoadedRef.current = true;
      setHasLoadedOnce(true);
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at && !n.read).length,
    [notifications],
  );

  const markOneAsRead = async (id: string) => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || now, read: true } : n)),
    );

    try {
      await supabase.from('notifications').update({ read_at: now, read: true }).eq('id', id);
    } catch (err) {
      console.warn('Impossibile aggiornare la notifica', err);
    }

    window.dispatchEvent(new Event('app:notifications-updated'));
  };

  const markAllAsRead = async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now, read: true })));
    try {
      await supabase
        .from('notifications')
        .update({ read_at: now, read: true })
        .is('read_at', null);
    } catch (err) {
      console.warn('Impossibile marcare tutte come lette', err);
    }

    window.dispatchEvent(new Event('app:notifications-updated'));
  };

  const renderText = (row: NotificationRow) => {
    const payload = row.payload || {};
    switch (row.kind) {
      case 'follow':
        return `Nuovo follower: ${payload.follower_name || 'un utente'}`;
      case 'dm':
        return `Nuovo messaggio da ${payload.sender_name || 'un contatto'}`;
      case 'new_post':
        return `${payload.author_name || 'Un profilo che segui'} ha pubblicato un aggiornamento`;
      default:
        return payload.text || 'Notifica di sistema';
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="heading-h1">Notifiche</h1>
          <p className="text-sm text-neutral-600">Controlla gli avvisi da club, player e messaggi diretti.</p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Segna tutte come lette
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {missingKind || missingPayload
            ? 'Colonne mancanti su notifications (kind/payload). Esegui il file supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql su Supabase.'
            : error}
        </p>
      )}
      {loading && !hasLoadedOnce && <p className="text-sm text-neutral-600">Caricamento…</p>}
      {refreshing && hasLoadedOnce && (
        <p className="text-xs text-neutral-500">Aggiornamento in corso…</p>
      )}

      {!loading && !notifications.length && !error && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white/60 p-4 text-sm text-neutral-600">
          Nessuna notifica al momento.
        </div>
      )}

      {!loading && !notifications.length && error && (missingKind || missingPayload) && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white/60 p-4 text-sm text-neutral-600">
          Le notifiche non possono essere caricate finché le colonne "kind" e "payload" non vengono aggiunte in Supabase (consulta supabase/migrations/20251018_fix_notifications_follows_post_reactions.sql).
        </div>
      )}

      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((row) => {
            const isRead = Boolean(row.read_at || row.read);
            return (
              <div
                key={row.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                  isRead ? 'border-neutral-200 bg-white' : 'border-[var(--brand)]/30 bg-[var(--brand)]/5'
                }`}
              >
                <div className="text-xl" aria-hidden>
                  {iconFor(row.kind)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{kindLabels[row.kind || ''] || 'Aggiornamento'}</span>
                    {!isRead && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                        Nuova
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-800">{renderText(row)}</p>
                  <p className="text-xs text-neutral-500">{formatDate(row.created_at)}</p>
                </div>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => void markOneAsRead(row.id)}
                    className="text-xs font-semibold text-[var(--brand)] underline"
                  >
                    Segna come letta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-neutral-500">
        {unreadCount > 0
          ? `${unreadCount} notifiche non lette`
          : 'Sei aggiornato su tutte le notifiche.'}
      </div>
    </div>
  );
}
