'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { PublicProfileSummary } from '@/lib/profiles/publicLookup';

const folderLabels: Record<Folder, string> = {
  inbox: 'Posta in arrivo',
  spam: 'Posta indesiderata',
  archived: 'Posta archiviata',
};

type Folder = 'inbox' | 'spam' | 'archived';
type ParticipantFilter = 'all' | 'club' | 'player' | 'unread';

type MessageRow = {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  receiver_id: string;
  text?: string | null;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
  folder?: Folder | null;
};

type Conversation = {
  id: string;
  peerId: string;
  peerName: string;
  peerRole: 'club' | 'player' | 'user';
  lastText: string;
  lastAt: string;
  unread: number;
  folder: Folder;
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
}

export default function MessagesPage() {
  const supabase = supabaseBrowser();

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [participantFilter, setParticipantFilter] = useState<ParticipantFilter>('all');
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState('');

  const loadMessages = useCallback(async (opts?: { manual?: boolean }) => {
    const manual = Boolean(opts?.manual);
    const alreadyLoaded = hasLoadedRef.current;
    setLoading((prev) => prev && !alreadyLoaded);
    setRefreshing(alreadyLoaded && manual);
    setError(null);
    const { data: userRes, error: authError } = await supabase.auth.getUser();
    if (authError || !userRes?.user) {
      setError('Devi accedere per vedere i messaggi.');
      setUserId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const me = userRes.user.id;
    setUserId(me);

    let rows: MessageRow[] = [];
    let queryError: Error | null = null;

    // prova con colonne estese (read_at/folder), fallback minimale se lo schema non è ancora aggiornato
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, receiver_id, text, body, created_at, read_at, folder')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(600);
      if (error) throw error;
      rows = (data || []) as MessageRow[];
    } catch (err: any) {
      queryError = err;
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, text, created_at')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(600);
      if (error) {
        setError(error.message || 'Errore nel caricare i messaggi');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      rows = (data || []) as MessageRow[];
    }

    const peers = Array.from(
      new Set(
        rows.map((row) => (row.sender_id === me ? row.receiver_id : row.sender_id)),
      ),
    );

    if (peers.length) {
      try {
        const idsParam = encodeURIComponent(peers.join(','));
        const res = await fetch(`/api/profiles/public?ids=${idsParam}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({ data: [] }));
        const map: Record<string, PublicProfileSummary> = {};
        const list = Array.isArray(json?.data) ? (json.data as PublicProfileSummary[]) : [];
        for (const item of list) {
          map[item.id] = item;
        }
        setProfiles(map);
      } catch (_err) {
        setProfiles({});
      }
    } else {
      setProfiles({});
    }

    setMessages(rows);
    setLoading(false);
    setRefreshing(false);
    hasLoadedRef.current = true;
    setHasLoadedOnce(true);

    if (rows.length) {
      const first = rows[0];
      const peerId = first.sender_id === me ? first.receiver_id : first.sender_id;
      setSelectedConversation((prev) => prev ?? first.conversation_id ?? peerId);
    }

    if (queryError) {
      console.warn('messages: fallback schema used', queryError);
    }
  }, [supabase]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!userId) return [];
    const map = new Map<string, Conversation>();

    for (const msg of messages) {
      const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const convId = msg.conversation_id || peerId;
      const peerProfile = profiles[peerId];
      const peerName =
        peerProfile?.display_name || peerProfile?.full_name || peerProfile?.headline || peerId;
      const peerRole =
        peerProfile?.account_type === 'club'
          ? 'club'
          : peerProfile?.account_type === 'athlete'
            ? 'player'
            : 'user';
      const content = msg.text || msg.body || '';
      const folderValue: Folder =
        msg.folder === 'spam' || msg.folder === 'archived' ? msg.folder : 'inbox';
      const unread = !msg.read_at && msg.receiver_id === userId ? 1 : 0;

      const current = map.get(convId);
      if (!current) {
        map.set(convId, {
          id: convId,
          peerId,
          peerName,
          peerRole,
          lastText: content,
          lastAt: msg.created_at,
          unread,
          folder: folderValue,
        });
      } else {
        if (new Date(msg.created_at).getTime() > new Date(current.lastAt).getTime()) {
          current.lastText = content;
          current.lastAt = msg.created_at;
          current.folder = folderValue;
        }
        current.unread += unread;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
  }, [messages, profiles, userId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (conv.folder !== folder) return false;
      if (participantFilter === 'unread') return conv.unread > 0;
      if (participantFilter === 'club') return conv.peerRole === 'club';
      if (participantFilter === 'player') return conv.peerRole === 'player';
      return true;
    });
  }, [conversations, folder, participantFilter]);

  const activeConversation = useMemo(() => {
    if (!selectedConversation) return null;
    return conversations.find((c) => c.id === selectedConversation) || null;
  }, [conversations, selectedConversation]);

  const threadMessages = useMemo(() => {
    if (!userId || !activeConversation) return [];
    return messages
      .filter((msg) => {
        const peer = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const convId = msg.conversation_id || peer;
        return convId === activeConversation.id;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [activeConversation, messages, userId]);

  const unreadCount = useMemo(
    () => conversations.reduce((acc, conv) => acc + conv.unread, 0),
    [conversations],
  );

  const markConversationAsRead = useCallback(async () => {
    if (!userId || !activeConversation) return;
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((msg) => {
        const peer = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const convId = msg.conversation_id || peer;
        if (convId === activeConversation.id && msg.receiver_id === userId && !msg.read_at) {
          return { ...msg, read_at: now };
        }
        return msg;
      }),
    );

    try {
      await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('receiver_id', userId)
        .is('read_at', null)
        .in('id', threadMessages.map((m) => m.id));
    } catch {
      // schema legacy: ripieghiamo sul tracker message_reads
      await supabase
        .from('message_reads')
        .upsert({ user_id: userId, peer_id: activeConversation.peerId, last_read_at: now });
    }

    window.dispatchEvent(new Event('app:unread-updated'));
  }, [activeConversation, supabase, threadMessages, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    void markConversationAsRead();
  }, [markConversationAsRead]);

  const moveConversation = async (target: Folder) => {
    if (!activeConversation) return;
    setMessages((prev) =>
      prev.map((msg) => {
        const peer = userId && msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const convId = msg.conversation_id || peer;
        if (convId === activeConversation.id) {
          return { ...msg, folder: target };
        }
        return msg;
      }),
    );

    try {
      await supabase
        .from('messages')
        .update({ folder: target })
        .in('id', threadMessages.map((m) => m.id));
    } catch (err) {
      console.warn('Impossibile aggiornare la cartella, lo schema potrebbe non avere folder', err);
    }
  };

  const sendMessage = async () => {
    if (!userId || !activeConversation || sending) return;
    const text = composer.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const peerId = activeConversation.peerId;
    const conversationId = activeConversation.id;
    const tempId = `temp-${Date.now()}`;

    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      receiver_id: peerId,
      text,
      created_at: now,
      folder: folder,
    };

    setMessages((prev) => [...prev, optimistic]);
    setComposer('');
    setSending(true);

    try {
      const payload: Record<string, any> = {
        sender_id: userId,
        receiver_id: peerId,
        text,
      };
      if (conversationId) payload.conversation_id = conversationId;
      await supabase.from('messages').insert(payload);
    } catch (err) {
      console.error('Errore invio messaggio', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setComposer(text);
      setError('Impossibile inviare il messaggio in questo momento.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="heading-h1">Messaggi</h1>
        <p className="text-sm text-neutral-600">Organizza la posta diretta in arrivo, indesiderata o archiviata.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_320px_1fr] xl:grid-cols-[300px_360px_1fr]">
        {/* Colonna sinistra: cartelle e filtri */}
        <aside className="glass-panel space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cartelle</p>
            <div className="flex flex-col gap-2">
              {(Object.keys(folderLabels) as Folder[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFolder(key)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    folder === key
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <span className="font-semibold">{folderLabels[key]}</span>
                  {key === 'inbox' && unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Filtri rapidi</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tutte' },
                { key: 'unread', label: 'Da leggere' },
                { key: 'club', label: 'Club' },
                { key: 'player', label: 'Player' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setParticipantFilter(item.key as ParticipantFilter)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    participantFilter === item.key
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-3 text-xs text-neutral-600">
            Filtra per ruolo (Club/Player) e cartella per mantenere l'inbox ordinata. Seleziona una conversazione per vedere il
            thread a destra.
          </div>
        </aside>

        {/* Colonna centrale: elenco conversazioni */}
        <section className="glass-panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="space-y-1">
              <h2 className="heading-h2 text-lg">Conversazioni</h2>
              <p className="text-xs text-neutral-600">Seleziona una conversazione per leggerla e rispondere.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadMessages({ manual: true })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              Aggiorna
            </button>
          </div>

          {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
          {loading && !hasLoadedOnce && <p className="px-4 py-6 text-sm text-neutral-600">Caricamento in corso…</p>}
          {refreshing && hasLoadedOnce && <p className="px-4 py-3 text-sm text-neutral-600">Aggiornamento…</p>}

          {!loading && !filteredConversations.length && (
            <div className="px-4 py-8 text-sm text-neutral-600">
              Nessuna conversazione trovata per i filtri selezionati.
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y">
              {filteredConversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${
                      selectedConversation === conv.id ? 'bg-[var(--brand)]/5' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
                      {conv.peerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{conv.peerName}</span>
                        {conv.peerRole !== 'user' && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] uppercase text-neutral-600">
                            {conv.peerRole}
                          </span>
                        )}
                        {conv.unread > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-1 text-sm text-neutral-700">{conv.lastText || 'Nuova conversazione'}</p>
                      <p className="text-xs text-neutral-500">{formatDate(conv.lastAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Colonna destra: dettaglio */}
        <section className="glass-panel flex min-h-[520px] flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="space-y-1">
              <h2 className="heading-h2 text-lg">Dettaglio conversazione</h2>
              {activeConversation ? (
                <p className="text-xs text-neutral-600">In chat con {activeConversation.peerName}</p>
              ) : (
                <p className="text-xs text-neutral-600">Seleziona una conversazione dalla lista.</p>
              )}
            </div>
            {activeConversation && (
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 hover:bg-neutral-50"
                  onClick={() => moveConversation('archived')}
                >
                  Archivia
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 hover:bg-neutral-50"
                  onClick={() => moveConversation('spam')}
                >
                  Spam
                </button>
              </div>
            )}
          </div>

          {!activeConversation && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-neutral-600">
              <p>Seleziona una conversazione a sinistra per leggere e rispondere.</p>
              <p>Usa i filtri per vedere posta in arrivo, indesiderata o archiviata.</p>
            </div>
          )}

          {activeConversation && (
            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {threadMessages.map((msg) => {
                  const mine = msg.sender_id === userId;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-neutral-900'
                            : 'border-neutral-200 bg-white text-neutral-900'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text || msg.body}</p>
                        <p className="mt-1 text-[11px] text-neutral-500">{formatDate(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t bg-neutral-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                    placeholder="Scrivi un messaggio…"
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    disabled={!activeConversation}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!activeConversation || sending}
                    className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                  >
                    Invia
                  </button>
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  I nuovi messaggi vengono salvati nella cartella corrente ({folderLabels[folder]}).
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
