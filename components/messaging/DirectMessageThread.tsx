'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/common/ToastProvider';
import {
  getDirectThread,
  markDirectThreadRead,
  sendDirectMessage,
  type DirectMessage,
} from '@/lib/services/messaging';

type Props = {
  targetProfileId: string;
  targetDisplayName: string;
  targetAvatarUrl: string | null;
  layout?: 'card' | 'dock';
  onClose?: () => void;
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
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={56}
        height={56}
        className="h-14 w-14 rounded-full object-cover"
      />
    );
  }
  return (
    <Image
      src={fallback}
      alt={name}
      width={56}
      height={56}
      className="h-14 w-14 rounded-full object-cover"
    />
  );
}

export function DirectMessageThread({
  targetProfileId,
  targetDisplayName,
  targetAvatarUrl,
  layout = 'card',
  onClose,
  className,
}: Props) {
  const { show } = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const thread = useMemo(() => messages || [], [messages]);
  const isDock = layout === 'dock';

  const scrollMessagesToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const threadData = await getDirectThread(targetProfileId);
        if (cancelled) return;
        setMessages(threadData.messages || []);
        setCurrentProfileId(threadData.currentProfileId ?? null);
      } catch (err: any) {
        if (cancelled) return;
        const message = err?.message || 'Errore caricamento messaggi';
        console.error('[direct-messages] thread load failed', { error: err, targetProfileId });
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
  }, [show, targetProfileId]);

  useEffect(() => {
    if (loading || error) return;
    let cancelled = false;

    const markRead = async () => {
      try {
        await markDirectThreadRead(targetProfileId);
        if (!cancelled) window.dispatchEvent(new Event('app:direct-messages-updated'));
      } catch (err) {
        console.error('[direct-messages] mark read failed', { error: err, targetProfileId });
      }
    };

    void markRead();

    return () => {
      cancelled = true;
    };
  }, [error, loading, targetProfileId, thread.length]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [targetProfileId, thread.length]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const newMessage = await sendDirectMessage(targetProfileId, { text: trimmed });
      setMessages((prev) => [...prev, newMessage].filter(Boolean));
      setContent('');
    } catch (err: any) {
      const message = err?.message || 'Errore invio messaggio';
      console.error('[direct-messages] send message failed', { error: err, targetProfileId });
      show(message, { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const headerName = targetDisplayName || 'Profilo';

  return (
    <div
      className={[
        isDock
          ? 'flex h-full flex-col rounded-t-2xl border bg-white shadow-2xl'
          : 'space-y-4 rounded-xl border bg-white p-4 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={`flex items-center gap-3 border-b ${isDock ? 'px-4 py-3' : 'pb-3'}`}>
        <Avatar name={headerName} avatarUrl={targetAvatarUrl} />
        <div className="flex-1">
          <div className="text-lg font-semibold text-neutral-900">{headerName}</div>
          <div className="text-sm text-neutral-500">Messaggi diretti</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Chiudi conversazione"
          >
            ×
          </button>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className={`min-h-0 space-y-3 overflow-y-auto bg-neutral-50 p-3 ${
          isDock ? 'flex-1' : 'min-h-[320px] rounded-lg'
        }`}
      >
        {loading && <div className="text-sm text-neutral-600">Caricamento conversazione…</div>}
        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && !error && thread.length === 0 && (
          <div className="rounded-md border border-dashed border-neutral-300 bg-white p-3 text-sm text-neutral-600">
            Nessun messaggio ancora. Scrivi il primo.
          </div>
        )}
        {!loading && !error &&
          thread.map((msg) => {
            const mine = currentProfileId ? msg.sender_profile_id === currentProfileId : false;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                    mine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">{formatDate(msg.created_at)}</div>
                  <div className="whitespace-pre-wrap text-neutral-900">{msg.content}</div>
                </div>
              </div>
            );
          })}
      </div>

      <div className={`space-y-2 border-t pt-2 ${isDock ? 'px-4 pb-4' : ''}`}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.altKey &&
              !event.metaKey &&
              !event.ctrlKey
            ) {
              event.preventDefault();
              void handleSend();
            }
          }}
          className="h-28 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          placeholder="Scrivi un messaggio"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="rounded-md bg-[var(--brand,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong,#0284c7)] hover:text-white hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#0ea5e9)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Invio…' : 'Invia'}
          </button>
        </div>
      </div>
    </div>
  );
}
