'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/common/ToastProvider';

type DirectMessage = {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  content: string;
  created_at: string;
};

type Props = {
  targetProfileId: string;
  targetDisplayName: string;
  targetAvatarUrl: string | null;
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

export function DirectMessageThread({ targetProfileId, targetDisplayName, targetAvatarUrl }: Props) {
  const { show } = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thread = useMemo(() => messages || [], [messages]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/direct-messages/${targetProfileId}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Errore caricamento messaggi');
        }
        if (cancelled) return;
        setMessages(Array.isArray((json as any)?.messages) ? (json as any).messages : []);
        setCurrentProfileId((json as any)?.currentProfileId ?? null);
      } catch (err: any) {
        if (cancelled) return;
        const message = err?.message || 'Errore caricamento messaggi';
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
        await fetch(`/api/direct-messages/${targetProfileId}/mark-read`, { method: 'POST' });
        if (!cancelled) {
          window.dispatchEvent(new Event('app:direct-messages-updated'));
        }
      } catch (err) {
        console.error('Errore mark-read', err);
      }
    };

    void markRead();

    return () => {
      cancelled = true;
    };
  }, [error, loading, targetProfileId, thread.length]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/direct-messages/${targetProfileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error || 'Errore invio messaggio');
      }
      const newMessage = (json as any)?.message as DirectMessage;
      setMessages((prev) => [...prev, newMessage]);
      setContent('');
    } catch (err: any) {
      const message = err?.message || 'Errore invio messaggio';
      show(message, { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const headerName = targetDisplayName || 'Profilo';

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 border-b pb-3">
        <Avatar name={headerName} avatarUrl={targetAvatarUrl} />
        <div>
          <div className="text-lg font-semibold text-neutral-900">{headerName}</div>
          <div className="text-sm text-neutral-500">Messaggi diretti</div>
        </div>
      </div>

      <div className="min-h-[320px] space-y-3 overflow-y-auto rounded-lg bg-neutral-50 p-3">
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

      <div className="space-y-2 border-t pt-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-28 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          placeholder="Scrivi un messaggio"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="rounded-md bg-[var(--brand,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark,#0369a1)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#0ea5e9)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Invio…' : 'Invia'}
          </button>
        </div>
      </div>
    </div>
  );
}
