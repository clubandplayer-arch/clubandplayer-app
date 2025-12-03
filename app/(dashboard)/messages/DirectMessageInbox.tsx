'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/components/common/ToastProvider';

type Thread = {
  otherProfileId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread?: boolean;
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

export function DirectMessageInbox() {
  const { show } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/direct-messages/threads', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Errore caricamento conversazioni');
        }
        if (cancelled) return;
        setThreads(Array.isArray((json as any)?.threads) ? (json as any).threads : []);
      } catch (err: any) {
        if (cancelled) return;
        const message = err?.message || 'Errore caricamento conversazioni';
        setError(message);
        show(message, { variant: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [show]);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-neutral-900">Messaggi diretti</h1>
      <p className="mt-2 text-sm text-neutral-600">Scegli con chi continuare la conversazione 1-a-1.</p>

      <div className="mt-4 space-y-3">
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
            <Link
              key={thread.otherProfileId}
              href={`/messages/${thread.otherProfileId}`}
              className="flex items-center gap-3 rounded-lg border border-transparent p-3 transition hover:border-[var(--brand)] hover:bg-neutral-50"
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
            </Link>
          ))}
      </div>
    </div>
  );
}
