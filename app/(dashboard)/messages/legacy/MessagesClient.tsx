'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMessaging } from '@/legacy/messaging/MessagingProvider';
import { useToast } from '@/components/common/ToastProvider';
import type { ConversationPreview, MessageItem } from '@/legacy/messaging/messaging.service';

function formatDate(value?: string | null) {
  if (!value) return '';
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

function Avatar({ peer }: { peer: ConversationPreview['peer'] }) {
  const src = peer?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(peer?.display_name || 'Profilo')}`;

  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200">
      {peer?.avatar_url ? (
        <Image src={src} alt={peer.display_name || 'Profilo'} width={48} height={48} className="h-12 w-12 object-cover" />
      ) : (
        <img src={src} alt={peer?.display_name || 'Profilo'} className="h-12 w-12 object-cover" />
      )}
    </div>
  );
}

function ConversationRow({
  item,
  active,
  onSelect,
}: {
  item: ConversationPreview;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const peerName = item.peer?.display_name || 'Profilo';
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        active ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm' : 'border-neutral-200 hover:border-[var(--brand)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar peer={item.peer} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-semibold">{peerName}</div>
            <div className="text-xs text-neutral-500">{formatDate(item.last_message_at)}</div>
          </div>
          <div className="truncate text-sm text-neutral-600">{item.last_message_preview || 'Nessun messaggio'}</div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, me }: { message: MessageItem; me: string | null }) {
  const mine = me ? message.sender_profile_id === me : false;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
          mine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="text-[11px] uppercase tracking-wide text-neutral-500">{formatDate(message.created_at)}</div>
        <div className="whitespace-pre-wrap text-neutral-900">{message.content}</div>
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
  const router = useRouter();
  const { show } = useToast();
  const [booting, setBooting] = useState(true);
  const {
    conversations,
    currentProfileId,
    activeConversationId,
    messages,
    drafts,
    loadingList,
    loadingThread,
    isSending,
    refresh,
    openConversationWithProfile,
    loadConversation,
    sendMessage,
    setDraft,
  } = useMessaging();

  const thread = useMemo(
    () => (activeConversationId ? messages[activeConversationId] ?? [] : []),
    [messages, activeConversationId],
  );
  const draft = useMemo(
    () => (activeConversationId ? drafts[activeConversationId] ?? '' : ''),
    [activeConversationId, drafts],
  );
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        await refresh();
        if (initialConversationId) {
          await loadConversation(initialConversationId);
          router.replace(`/messages?conversation=${initialConversationId}`);
          return;
        }
        if (initialTargetProfileId) {
          const createdId = await openConversationWithProfile(initialTargetProfileId);
          if (createdId) {
            await loadConversation(createdId);
            router.replace(`/messages?conversation=${createdId}`);
          }
          return;
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('[messages] apertura iniziale fallita', error);
          show(error?.message || 'Errore apertura conversazione', { variant: 'error' });
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    initialConversationId,
    initialTargetProfileId,
    loadConversation,
    openConversationWithProfile,
    refresh,
    router,
    show,
  ]);

  useEffect(() => {
    if (!booting && !activeConversationId && conversations.length > 0) {
      void loadConversation(conversations[0].id);
    }
  }, [booting, activeConversationId, conversations, loadConversation]);

  useEffect(() => {
    if (activeConversationId) {
      router.replace(`/messages?conversation=${activeConversationId}`);
    }
  }, [activeConversationId, router]);

  const handleSelect = (id: string) => {
    void loadConversation(id);
  };

  const handleSend = async () => {
    if (!activeConversationId || !draft.trim() || isSending) return;
    try {
      await sendMessage(activeConversationId, draft);
    } catch (error: any) {
      console.error('[messages] errore invio', error);
      show(error?.message || 'Errore invio messaggio', { variant: 'error' });
    }
  };

  const handleDraftChange = (value: string) => {
    if (!activeConversationId) return;
    setDraft(activeConversationId, value);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
      <aside className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Le tue conversazioni</h1>
            <p className="text-sm text-neutral-500">Seleziona una chat per continuare a parlare.</p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="text-sm text-[var(--brand)] hover:underline"
          >
            Aggiorna
          </button>
        </div>
        {loadingList && <div className="text-sm text-neutral-500">Caricamento conversazioni…</div>}
        <div className="space-y-2">
          {conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              item={conv}
              active={conv.id === activeConversationId}
              onSelect={handleSelect}
            />
          ))}
          {!loadingList && conversations.length === 0 && !booting && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-600">
              Non hai ancora alcuna conversazione.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-[480px] flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
        {loadingThread && <div className="text-sm text-neutral-500">Caricamento thread…</div>}
        {activeConversationId && activeConversation ? (
          <>
            <div className="flex items-center gap-3 border-b pb-3">
              <Avatar peer={activeConversation.peer} />
              <div>
                <div className="font-semibold text-neutral-900">
                  {activeConversation.peer?.display_name || 'Conversazione'}
                </div>
                <div className="text-sm text-neutral-500">Chat privata</div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
              {thread.map((msg) => (
                <MessageBubble key={msg.id} message={msg} me={currentProfileId} />
              ))}
              {thread.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-sm text-neutral-600">
                  Nessun messaggio ancora. Scrivi il primo.
                </div>
              )}
            </div>
            <div className="space-y-2 border-t pt-2">
              <textarea
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                className="h-28 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                placeholder="Scrivi un messaggio"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || isSending}
                  className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? 'Invio…' : 'Invia'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-600">
            {booting ? 'Preparazione conversazione…' : 'Seleziona o apri una conversazione.'}
          </div>
        )}
      </section>
    </div>
  );
}
