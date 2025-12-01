'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function MessagesClient({
  initialConversationId,
  initialTargetProfileId,
}: {
  initialConversationId?: string | null;
  initialTargetProfileId?: string | null;
}) {
  const { show } = useToast();
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [me, setMe] = useState<ProfileSummary | null>(null);
  const [peer, setPeer] = useState<ProfileSummary | null>(null);
  const [draft, setDraft] = useState('');
  const [reloading, setReloading] = useState(0);
  const [pendingTarget, setPendingTarget] = useState(initialTargetProfileId ?? '');
  const [sending, setSending] = useState(false);
  const initialConversationRef = useRef(initialConversationId?.trim() || '');
  const initialTargetRef = useRef(initialTargetProfileId?.trim() || '');
  const appliedInitialRef = useRef(false);

  const currentPeer = useMemo(
    () => peer ?? conversations.find((c) => c.id === selectedId)?.peer ?? null,
    [peer, conversations, selectedId]
  );

  useEffect(() => {
    initialConversationRef.current = initialConversationId?.trim() || '';
    initialTargetRef.current = initialTargetProfileId?.trim() || '';
    appliedInitialRef.current = false;
    setPendingTarget(initialTargetProfileId ?? '');
    setSelectedId(initialConversationId ?? null);
  }, [initialConversationId, initialTargetProfileId]);

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
        if (!appliedInitialRef.current) {
          appliedInitialRef.current = true;
          const conversationFromParams = initialConversationRef.current;
          const targetFromParams = initialTargetRef.current;

          if (conversationFromParams) {
            setSelectedId(conversationFromParams);
          } else if (targetFromParams) {
            const existing = (json.data ?? []).find((c) => c.peer?.id === targetFromParams);
            if (existing) {
              setSelectedId(existing.id);
            } else {
              setPendingTarget(targetFromParams);
            }
          } else if (!selectedId && (json.data?.length ?? 0) > 0) {
            setSelectedId(json.data[0].id);
          }
        } else if (!selectedId && (json.data?.length ?? 0) > 0) {
          setSelectedId(json.data[0].id);
        }
      })
      .catch((e) => !cancelled && show(e.message || 'Errore nel caricamento', { variant: 'error' }))
      .finally(() => !cancelled && setLoadingList(false));

    return () => {
      cancelled = true;
    };
  }, [reloading, selectedId, show]);

  useEffect(() => {
    if (!pendingTarget || loadingList || selectedId) return;
    handleStartConversation(pendingTarget, { silent: true });
  }, [pendingTarget, loadingList, selectedId]);

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
      .catch((e) => {
        if (cancelled) return;
        show(e.message || 'Errore nel thread', { variant: 'error' });
        setSelectedId(null);
        setMessages([]);
        setPeer(null);
      })
      .finally(() => !cancelled && setLoadingThread(false));

    return () => {
      cancelled = true;
    };
  }, [selectedId, reloading, show]);

  async function handleSend() {
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error || 'Errore invio messaggio');
      }
      setDraft('');
      setReloading((v) => v + 1);
    } catch (e: any) {
      show(e.message || 'Errore invio', { variant: 'error' });
    } finally {
      setSending(false);
    }
  }

  async function handleStartConversation(targetId: string, options?: { silent?: boolean }) {
    const cleanTarget = (targetId || '').trim();

    if (!cleanTarget) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: cleanTarget, message: '' }),
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
      setSelectedId(newId || selectedId);
      setPendingTarget('');
      setReloading((v) => v + 1);
      if (!options?.silent) show('Conversazione aggiornata', { variant: 'success' });
    } catch (e: any) {
      setPendingTarget('');
      if (!options?.silent) {
        show(e.message || 'Errore', { variant: 'error' });
      } else {
        console.error('Errore creazione conversazione', e);
      }
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
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            <div>Seleziona una conversazione o apri un profilo per avviarne una nuova.</div>
            {pendingTarget ? <div className="text-xs text-neutral-500">Preparazione conversazione…</div> : null}
          </div>
        ) : (
          <>
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
                  disabled={!draft.trim() || !selectedId || sending}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand)]/90 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <MaterialIcon name="send" fontSize="small" />
                  {sending ? 'Invio…' : 'Invia'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
