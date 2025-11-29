'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  ConversationDetailResponse,
  ConversationSummary,
  ConversationsApiResponse,
  MessageItem,
  ProfileSummary,
} from '@/types/messaging';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { useToast } from '@/components/common/ToastProvider';

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function avatarSrc(name?: string | null, url?: string | null) {
  if (url) return url;
  const seed = encodeURIComponent(name || 'Profilo');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

function profileHref(peer?: ProfileSummary | null) {
  if (!peer) return '#';
  const account = (peer.account_type || '').toLowerCase();
  if (account.startsWith('club')) return `/clubs/${peer.id}`;
  if (account === 'athlete' || account === 'player') return `/athletes/${peer.id}`;
  return `/clubs/${peer.id}`;
}

function PeerBadge({ peer }: { peer: ProfileSummary | null }) {
  if (!peer) return <span className="text-sm text-neutral-500">Profilo sconosciuto</span>;
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc(peer.display_name, peer.avatar_url)}
        alt={peer.display_name || 'Profilo'}
        className="h-10 w-10 rounded-full border border-neutral-200 object-cover"
      />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-neutral-900">{peer.display_name || 'Profilo'}</span>
        <span className="text-xs uppercase tracking-wide text-neutral-500">{peer.account_type || '—'}</span>
      </div>
    </div>
  );
}

function ConversationList({
  items,
  activeId,
  onSelect,
}: {
  items: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-600">Nessuna conversazione</div>}
      {items.map((conv) => {
        const peer = conv.peer;
        const active = conv.id === activeId;
        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={`w-full rounded-xl border p-3 text-left transition hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 ${
              active ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm' : 'border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc(peer?.display_name, peer?.avatar_url)}
                alt={peer?.display_name || 'Profilo'}
                className="h-10 w-10 rounded-full border border-neutral-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-semibold text-neutral-900">{peer?.display_name || 'Profilo'}</div>
                  <div className="text-xs text-neutral-500">{formatDate(conv.last_message_at || conv.updated_at)}</div>
                </div>
                <div className="truncate text-sm text-neutral-600">{conv.last_message_preview || 'Nessun messaggio'}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  author,
}: {
  message: MessageItem;
  isMine: boolean;
  author?: ProfileSummary | null;
}) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
          isMine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10 text-neutral-900' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
          <span>{author?.display_name || (isMine ? 'Tu' : 'Utente')}</span>
          <span>{formatDate(message.created_at)}</span>
        </div>
        <div className="whitespace-pre-wrap text-neutral-800">{message.body}</div>
      </div>
    </div>
  );
}

export default function MessagesClient() {
  const { show } = useToast();
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [me, setMe] = useState<ProfileSummary | null>(null);
  const [peer, setPeer] = useState<ProfileSummary | null>(null);
  const [draft, setDraft] = useState('');
  const [targetProfile, setTargetProfile] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [reloading, setReloading] = useState(0);

  const currentPeer = useMemo(
    () => peer ?? conversations.find((c) => c.id === selectedId)?.peer ?? null,
    [peer, conversations, selectedId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    fetch('/api/messages', { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as Partial<ConversationsApiResponse> & { error?: string };
        if (!r.ok) throw new Error(payload?.error || 'Errore nel caricamento');
        return payload as ConversationsApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setConversations(Array.isArray(json.data) ? json.data : []);
        setMe(json.me || null);
        if (!selectedId && (json.data?.length ?? 0) > 0) setSelectedId(json.data[0].id);
      })
      .catch((e) => !cancelled && show(e.message || 'Errore nel caricamento', { variant: 'error' }))
      .finally(() => !cancelled && setLoadingList(false));

    return () => {
      cancelled = true;
    };
  }, [reloading, selectedId, show]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setPeer(null);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    fetch(`/api/messages/${selectedId}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const payload = (await r.json().catch(() => ({}))) as Partial<ConversationDetailResponse> & { error?: string };
        if (!r.ok) throw new Error(payload?.error || 'Errore nel thread');
        return payload as ConversationDetailResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setMessages(Array.isArray(json.messages) ? json.messages : []);
        setPeer(json.peer ?? null);
      })
      .catch((e) => !cancelled && show(e.message || 'Errore nel thread', { variant: 'error' }))
      .finally(() => !cancelled && setLoadingThread(false));

    return () => {
      cancelled = true;
    };
  }, [selectedId, reloading, show]);

  async function handleSend() {
    if (!draft.trim() || !selectedId) return;
    try {
      const res = await fetch(`/api/messages/${selectedId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Errore invio messaggio');
      }
      setDraft('');
      setReloading((v) => v + 1);
    } catch (e: any) {
      show(e.message || 'Errore invio', { variant: 'error' });
    }
  }

  async function handleStartConversation() {
    if (!targetProfile.trim()) {
      show('Inserisci un profilo destinatario', { variant: 'warning' });
      return;
    }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: targetProfile.trim(), message: initialMessage.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j.error || text || 'Errore creazione conversazione');
        } catch {
          throw new Error(text || 'Errore creazione conversazione');
        }
      }
      const j = JSON.parse(text) as any;
      const newId = j?.data?.conversationId as string;
      setTargetProfile('');
      setInitialMessage('');
      setSelectedId(newId || selectedId);
      setReloading((v) => v + 1);
      show('Conversazione aggiornata', { variant: 'success' });
    } catch (e: any) {
      show(e.message || 'Errore', { variant: 'error' });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start">
      <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Messaggi</div>
            <div className="text-lg font-semibold text-neutral-900">Conversazioni</div>
          </div>
          <button
            type="button"
            onClick={() => setReloading((v) => v + 1)}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm text-neutral-700 transition hover:bg-neutral-50"
          >
            <MaterialIcon name="refresh" fontSize="small" />
            Aggiorna
          </button>
        </div>
        <div className="mb-4 space-y-2 rounded-xl bg-neutral-50 p-3">
          <div className="text-sm font-semibold text-neutral-800">Nuova conversazione</div>
          <input
            value={targetProfile}
            onChange={(e) => setTargetProfile(e.target.value)}
            placeholder="ID profilo destinatario"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          />
          <textarea
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Messaggio iniziale (opzionale)"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
            rows={3}
          />
          <button
            type="button"
            onClick={handleStartConversation}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand)]/90"
          >
            Avvia
          </button>
        </div>
        {loadingList ? (
          <div className="text-sm text-neutral-500">Caricamento…</div>
        ) : (
          <ConversationList items={conversations} activeId={selectedId} onSelect={setSelectedId} />
        )}
      </section>

      <section className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <PeerBadge peer={currentPeer || null} />
          {currentPeer?.id && (
            <Link
              href={profileHref(currentPeer)}
              className="text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Vedi profilo
            </Link>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-neutral-50 p-3">
          {loadingThread && <div className="text-sm text-neutral-500">Caricamento thread…</div>}
          {!loadingThread && messages.length === 0 && (
            <div className="text-sm text-neutral-500">Nessun messaggio in questa conversazione.</div>
          )}
          {!loadingThread &&
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isMine={!!me && !!m.sender_profile_id && m.sender_profile_id === me.id}
                author={
                  m.sender_profile_id === me?.id
                    ? me
                    : currentPeer?.id === m.sender_profile_id
                    ? currentPeer
                    : currentPeer
                }
              />
            ))}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-neutral-200 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Scrivi un messaggio"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          />
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>Invia ai tuoi contatti. Altre funzioni arriveranno a breve.</span>
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || !selectedId}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand)]/90 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              <MaterialIcon name="send" fontSize="small" />
              Invia
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
