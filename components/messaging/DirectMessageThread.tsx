'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';
import {
  getDirectThread,
  markDirectThreadRead,
  sendDirectMessage,
  updateDirectMessage,
  deleteDirectMessage,
  deleteDirectConversation,
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
  const router = useRouter();
  const { show } = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const thread = useMemo(() => messages || [], [messages]);
  const isDock = layout === 'dock';

  const scrollMessagesToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const canEditOrDelete = (msg: DirectMessage) => {
    const created = new Date(msg.created_at).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created <= 30_000;
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

  const startEditing = (msg: DirectMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content || '');
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleEditSubmit = async () => {
    const targetId = editingMessageId;
    if (!targetId) return;
    const trimmed = editingContent.trim();
    if (!trimmed) {
      show('Inserisci un testo', { variant: 'error' });
      return;
    }

    try {
      const updated = await updateDirectMessage(targetId, trimmed);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      cancelEditing();
      scrollMessagesToBottom();
    } catch (err: any) {
      const message = err?.message || 'Non è stato possibile modificare il messaggio';
      console.error('[direct-messages] edit message failed', { error: err, targetId });
      show(message, { variant: 'error' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm('Vuoi eliminare questo messaggio?') : true;
    if (!confirmed) return;

    try {
      await deleteDirectMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (editingMessageId === messageId) cancelEditing();
      scrollMessagesToBottom();
    } catch (err: any) {
      const message = err?.message || 'Non è stato possibile eliminare il messaggio';
      console.error('[direct-messages] delete message failed', { error: err, messageId });
      show(message, { variant: 'error' });
    }
  };

  const handleDeleteConversation = async () => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Vuoi eliminare tutta la chat?') : true;
    if (!confirmed) return;

    try {
      await deleteDirectConversation(targetProfileId);
      setMessages([]);
      if (onClose) {
        onClose();
      } else {
        router.push('/messages');
      }
    } catch (err: any) {
      const message = err?.message || 'Non è stato possibile cancellare la chat';
      console.error('[direct-messages] delete conversation failed', { error: err, targetProfileId });
      show(message, { variant: 'error' });
    }
  };

  const headerName = targetDisplayName || 'Profilo';

  return (
    <div
      className={[
        isDock
          ? 'flex h-full max-h-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl'
          : 'flex h-[calc(100vh-220px)] min-h-[520px] max-h-[calc(100vh-160px)] flex-col overflow-hidden rounded-xl border bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={`flex flex-none items-center gap-3 border-b bg-white ${isDock ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <Avatar name={headerName} avatarUrl={targetAvatarUrl} />
        <div className="flex-1">
          <div className="text-lg font-semibold text-neutral-900">{headerName}</div>
          <div className="text-sm text-neutral-500">Messaggi diretti</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteConversation}
            className="inline-flex items-center justify-center rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Cancella chat
          </button>
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
      </div>

      <div
        ref={messagesContainerRef}
        className={`flex-1 space-y-3 overflow-y-auto bg-neutral-50 ${isDock ? 'px-4 py-3' : 'px-5 py-4'}`}
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
          thread.map((msg, index) => {
            const mine = currentProfileId ? msg.sender_profile_id === currentProfileId : false;
            const editable = mine && canEditOrDelete(msg);
            const isEditing = editingMessageId === msg.id;
            const ref = index === thread.length - 1 ? lastMessageRef : null;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`} ref={ref}>
                <div
                  className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                    mine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-neutral-500">
                    <span>{formatDate(msg.created_at)}</span>
                    {msg.edited_at && <span className="text-[10px] normal-case text-neutral-500">(modificato)</span>}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full resize-none rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        rows={3}
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-neutral-700 transition hover:bg-neutral-100"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={handleEditSubmit}
                          className="rounded-md bg-[var(--brand,#0ea5e9)] px-3 py-1 font-semibold text-white transition hover:bg-[var(--brand-strong,#0284c7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#0ea5e9)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                          Salva
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-neutral-900">{msg.content}</div>
                  )}
                  {mine && !isEditing && editable && (
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-neutral-600">
                      <button
                        type="button"
                        onClick={() => startEditing(msg)}
                        className="rounded px-2 py-1 transition hover:bg-neutral-200"
                      >
                        Modifica
                      </button>
                      <span className="text-neutral-300">•</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMessage(msg.id)}
                        className="rounded px-2 py-1 transition hover:bg-neutral-200"
                      >
                        Elimina
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div className={`flex-none space-y-2 border-t bg-white ${isDock ? 'px-4 py-3' : 'px-5 py-4'}`}>
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
