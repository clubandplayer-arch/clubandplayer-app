'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';
import {
  getDirectInbox,
  markDirectThreadRead,
  openDirectConversation,
  type DirectThreadSummary,
} from '@/lib/services/messaging';

type Props = {
  onSelectThread?: (thread: DirectThreadSummary) => void;
  hideHeader?: boolean;
  className?: string;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Profilo')}`;
  const src = avatarUrl || fallback;
  return (
    <Image
      src={src}
      alt={name}
      width={48}
      height={48}
      className="h-12 w-12 rounded-full object-cover"
    />
  );
}

export function DirectMessageInbox({ onSelectThread, hideHeader, className }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [threads, setThreads] = useState<DirectThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerClass = ['rounded-xl border bg-white p-6 shadow-sm', className].filter(Boolean).join(' ');

  const loadInbox = useCallback(async (cancelled?: { current: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const inbox = await getDirectInbox();
      if (!cancelled?.current) setThreads(inbox);
    } catch (err: any) {
      if (cancelled?.current) return;
      const message = err?.message || 'Errore caricamento conversazioni';
      console.error('[direct-messages] inbox load failed', { error: err });
      setError(message);
      show(message, { variant: 'error' });
    } finally {
      if (!cancelled?.current) setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    const cancelled = { current: false };
    void loadInbox(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [loadInbox]);

  useEffect(() => {
    const handleUpdate = () => {
      void loadInbox();
    };

    window.addEventListener('app:direct-messages-updated', handleUpdate);
    return () => window.removeEventListener('app:direct-messages-updated', handleUpdate);
  }, [loadInbox]);

  const handleOpen = async (thread: DirectThreadSummary) => {
    const markAsRead = async () => {
      try {
        await markDirectThreadRead(thread.otherProfileId);
        setThreads((prev) =>
          prev.map((t) =>
            t.otherProfileId === thread.otherProfileId ? { ...t, hasUnread: false } : t,
          ),
        );
        window.dispatchEvent(new Event('app:direct-messages-updated'));
      } catch (error) {
        console.error('[direct-messages] mark read failed', {
          targetProfileId: thread.otherProfileId,
          error,
        });
      }
    };

    if (onSelectThread) {
      onSelectThread({ ...thread, hasUnread: false });
      void markAsRead();
      return;
    }

    try {
      void markAsRead();
      await openDirectConversation(thread.otherProfileId, { router, source: 'messages-inbox' });
    } catch (error: any) {
      console.error('[direct-messages] inbox navigation failed', { targetProfileId: thread.otherProfileId, error });
      show(error?.message || 'Errore apertura chat', { variant: 'error' });
    }
  };

  return (
    <div className={containerClass}>
      {!hideHeader && (
        <>
          <h1 className="text-xl font-semibold text-neutral-900">Messaggi diretti</h1>
          <p className="mt-2 text-sm text-neutral-600">Scegli con chi continuare la conversazione 1-a-1.</p>
        </>
      )}

      <div className={`${hideHeader ? 'mt-0' : 'mt-4'} space-y-3`}>
        {loading && <div className="text-sm text-neutral-600">Caricamento conversazioni…</div>}
        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && !error && threads.length === 0 && (
          <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-700">
            Non hai ancora messaggi. Apri un profilo e clicca “Messaggia” per iniziare una chat 1-a-1.
          </div>
        )}
        {!loading && !error &&
          threads.map((thread) => (
            <button
              key={thread.otherProfileId}
              type="button"
              onClick={() => void handleOpen(thread)}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent p-3 text-left transition hover:border-[var(--brand)] hover:bg-neutral-50"
            >
              <Avatar name={thread.otherName} avatarUrl={thread.otherAvatarUrl} />
              <div className="flex-1">
                <div className={`text-sm font-semibold ${thread.hasUnread ? 'text-[var(--brand)]' : 'text-neutral-900'}`}>
                  {thread.otherName}
                </div>
                <div className={`line-clamp-2 text-sm ${thread.hasUnread ? 'text-neutral-800' : 'text-neutral-600'}`}>
                  {thread.lastMessage}
                </div>
              </div>
              <div className="text-xs text-neutral-500">{formatDate(thread.lastMessageAt)}</div>
              {thread.hasUnread && (
                <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-[var(--brand)]" aria-hidden="true" />
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
