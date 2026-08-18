'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastProvider';
import { compressImageInBrowser } from '@/lib/images/compressImageInBrowser';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Lightbox } from '@/components/media/Lightbox';
import {
  getDirectThread,
  markDirectThreadRead,
  sendDirectMessage,
  updateDirectMessage,
  deleteDirectMessage,
  deleteDirectConversation,
  setDirectMessageReaction,
  removeDirectMessageReaction,
  type DirectMessage,
} from '@/lib/services/messaging';

type Props = {
  targetProfileId: string;
  targetDisplayName: string;
  targetAvatarUrl: string | null;
  targetAccountType?: string | null;
  layout?: 'card' | 'dock';
  onClose?: () => void;
  className?: string;
};

const CHAT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😂', '🥹', '😊', '😍', '😘', '😎', '🤩', '🥳', '😢', '😭', '😡',
  '👍', '👏', '🙌', '🙏', '💪', '⚽', '🏀', '🏐', '🏉', '🏆', '❤️', '🧡', '💛', '💚', '💙', '💜', '🔥', '🎉',
];
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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

function emojiOnlyCount(value?: string | null) {
  const content = value?.trim();
  if (!content) return 0;
  const emojiParts = content.match(/\p{Extended_Pictographic}/gu) ?? [];
  if (!emojiParts.length) return 0;
  const remainder = content.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\s]/gu, '');
  return remainder ? 0 : emojiParts.length;
}

function renderMessageText(value: string, enlargeInlineEmoji: boolean) {
  if (!enlargeInlineEmoji) return value;
  const parts = value.split(/(\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu);
  return parts.map((part, index) =>
    /\p{Extended_Pictographic}/u.test(part) ? (
      <span key={`${part}-${index}`} className="inline-block text-xl leading-none align-[-0.12em]">{part}</span>
    ) : part,
  );
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
  targetAccountType,
}: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [optimizingAttachment, setOptimizingAttachment] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [voice, setVoice] = useState<File | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [peerAccountType, setPeerAccountType] = useState<string | null>(targetAccountType ?? null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const didMarkReadRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const realtimePresenceReadyRef = useRef(false);
  const thread = useMemo(() => messages || [], [messages]);
  const isDock = layout === 'dock';

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  useEffect(() => {
    if (!voice) { setVoicePreviewUrl(null); return; }
    const url = URL.createObjectURL(voice);
    setVoicePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [voice]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recording && recordingSeconds >= 120) mediaRecorderRef.current?.stop();
  }, [recording, recordingSeconds]);

  useEffect(() => () => recordingStreamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const toggleRecording = async () => {
    if (recording) { mediaRecorderRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSendError('La registrazione vocale non è supportata da questo browser'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const mime = recorder.mimeType.split(';')[0] || 'audio/webm';
        const extension = mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type: mime });
        if (!blob.size) setSendError('La registrazione è vuota, riprova');
        else if (blob.size <= 5_000_000) setVoice(new File([blob], `vocale.${extension}`, { type: mime }));
        else setSendError('Il messaggio vocale supera 5 MB');
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecording(false);
      };
      mediaRecorderRef.current = recorder;
      setVoice(null); setAttachment(null); setRecordingSeconds(0); setSendError(null); setRecording(true);
      recorder.start(250);
    } catch {
      setSendError('Consenti l’accesso al microfono per registrare un messaggio vocale');
    }
  };

  const scrollMessagesToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const selectAttachment = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      show('Puoi allegare soltanto una foto', { variant: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      show('La foto non può superare 10 MB', { variant: 'error' });
      return;
    }
    setSendError(null);
    setOptimizingAttachment(true);
    try {
      setAttachment(await compressImageInBrowser(file));
    } catch (error: any) {
      const message = error?.message || 'Non è stato possibile ottimizzare la foto';
      setSendError(message);
      show(message, { variant: 'error' });
    } finally {
      setOptimizingAttachment(false);
    }
  };

  const canEditOrDelete = (msg: DirectMessage) => {
    const created = new Date(msg.created_at).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created <= 30_000;
  };

  const reloadThread = useCallback(async () => {
    setError(null);
    try {
      const threadData = await getDirectThread(targetProfileId);
      setMessages(threadData.messages || []);
      setCurrentProfileId(threadData.currentProfileId ?? null);
      setPeerAccountType(threadData.peer?.account_type ?? targetAccountType ?? null);
      if (!realtimePresenceReadyRef.current && threadData.peerOnline !== null) {
        setPeerOnline(threadData.peerOnline);
      }
      setPeerLastReadAt(threadData.peerLastReadAt);
    } catch (err: any) {
      const message = err?.message || 'Errore caricamento messaggi';
      console.error('[direct-messages] thread load failed', { error: err, targetProfileId });
      setError(message);
      show(message, { variant: 'error' });
    }
  }, [show, targetAccountType, targetProfileId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    realtimePresenceReadyRef.current = false;
    const channel = supabase.channel('app-online-presence');
    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
      realtimePresenceReadyRef.current = true;
      setPeerOnline(Boolean(state[targetProfileId]?.length));
    };

    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.on('presence', { event: 'join' }, syncPresence);
    channel.on('presence', { event: 'leave' }, syncPresence);
    channel.subscribe();

    return () => {
      realtimePresenceReadyRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [targetProfileId]);

  useEffect(() => {
    let mounted = true;

    const startPolling = () => {
      if (!mounted || typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      return window.setInterval(() => {
        void reloadThread();
      }, 3000);
    };

    let intervalId: number | undefined;

    const loadOnMount = async () => {
      setLoading(true);
      await reloadThread();
      if (mounted) {
        setLoading(false);
        intervalId = startPolling();
      }
    };

    const stopPolling = () => {
      if (typeof intervalId === 'number') {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reloadThread();
        stopPolling();
        intervalId = startPolling();
        return;
      }
      stopPolling();
    };

    const handleFocus = () => {
      void reloadThread();
    };

    void loadOnMount();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [reloadThread]);

  useEffect(() => {
    didMarkReadRef.current = null;
  }, [targetProfileId]);

  useEffect(() => {
    if (loading || error) return;
    const lastIncomingId = [...thread].reverse().find((message) => message.sender_profile_id === targetProfileId)?.id ?? 'empty';
    if (didMarkReadRef.current === lastIncomingId) return;
    didMarkReadRef.current = lastIncomingId;
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
  }, [error, loading, targetProfileId, thread]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [targetProfileId, thread.length]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if ((!trimmed && !attachment && !voice) || sending || optimizingAttachment || recording) return;
    setSendError(null);
    setSending(true);
    try {
      await sendDirectMessage(targetProfileId, { text: trimmed, attachment, voice });
      setContent('');
      setAttachment(null);
      setVoice(null);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      await reloadThread();
    } catch (err: any) {
      const message = err?.message || 'Errore invio messaggio';
      console.error('[direct-messages] send message failed', { error: err, targetProfileId });
      setSendError(message);
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

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find((item) => item.id === messageId);
      const mine = message?.reactions?.find((reaction) => reaction.profile_id === currentProfileId);
      if (mine?.emoji === emoji) await removeDirectMessageReaction(messageId);
      else await setDirectMessageReaction(messageId, emoji);
      setReactionPickerMessageId(null);
      await reloadThread();
    } catch (err: any) {
      show(err?.message || 'Non è stato possibile aggiungere la reazione', { variant: 'error' });
    }
  };

  const handleDeleteConversation = async () => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Vuoi eliminare tutta la chat?') : true;
    if (!confirmed) return;

    try {
      await deleteDirectConversation(targetProfileId);
      setMessages([]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app:direct-messages-updated'));
      }
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
  const profileHref =
    peerAccountType && peerAccountType.toLowerCase().includes('club')
      ? `/c/${targetProfileId}`
      : `/u/${targetProfileId}`;

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
        <Link href={profileHref} aria-label={`Vai al profilo di ${headerName}`}>
          <Avatar name={headerName} avatarUrl={targetAvatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={profileHref} className="block truncate text-lg font-semibold text-neutral-900 hover:underline">
            {headerName}
          </Link>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${peerOnline ? 'text-emerald-600' : 'text-neutral-500'}`}>
            <span className={`h-2 w-2 rounded-full ${peerOnline ? 'bg-emerald-500' : 'bg-neutral-400'}`} aria-hidden="true" />
            <span>{peerOnline === null ? 'Verifica presenza…' : peerOnline ? 'Online' : 'Offline'}</span>
          </div>
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
            const emojiCount = emojiOnlyCount(msg.content);
            const isSingleEmoji = emojiCount === 1;
            const hasInlineEmoji = emojiCount === 0 && /\p{Extended_Pictographic}/u.test(msg.content || '');
            const ref = index === thread.length - 1 ? lastMessageRef : null;
            return (
              <div key={msg.id} className={`group relative flex ${mine ? 'justify-end' : 'justify-start'}`} ref={ref}>
                <button
                  type="button"
                  onClick={() => setReactionPickerMessageId((value) => value === msg.id ? null : msg.id)}
                  className={`mx-2 flex h-8 w-8 flex-none self-center items-center justify-center rounded-full border bg-white text-base shadow-sm transition hover:bg-neutral-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 ${mine ? '' : 'order-2'}`}
                  aria-label="Aggiungi una reazione"
                >
                  ☺
                </button>
                {reactionPickerMessageId === msg.id && (
                  <div className={`absolute bottom-full z-30 mb-2 flex gap-1 rounded-full border bg-white p-2 shadow-xl ${mine ? 'right-0' : 'left-0'}`}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => void handleReaction(msg.id, emoji)} className="rounded-full p-1 text-xl transition hover:scale-125 hover:bg-neutral-100" aria-label={`Reagisci con ${emoji}`}>{emoji}</button>
                    ))}
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${isSingleEmoji ? 'border-0 bg-transparent px-1 py-1 shadow-none' : 'rounded-2xl border px-3 py-2 text-sm shadow-sm'} ${
                    isSingleEmoji ? '' : mine ? 'rounded-br-sm border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'
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
                    <>
                      {msg.attachment_url && (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(msg.attachment_url ?? null)}
                          className="mt-1 block cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
                          aria-label="Apri la foto allegata"
                        >
                          {/* The authenticated endpoint redirects to a short-lived private Storage URL. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.attachment_url}
                            alt="Foto allegata al messaggio"
                            className="max-h-80 w-auto max-w-full rounded-xl object-contain"
                          />
                        </button>
                      )}
                      {msg.content && (
                        <div className={`${msg.attachment_url ? 'mt-2' : ''} whitespace-pre-wrap text-neutral-900 ${
                          isSingleEmoji ? 'text-5xl leading-none' : emojiCount > 1 ? 'text-xl leading-snug' : ''
                        }`}>{renderMessageText(msg.content, hasInlineEmoji)}</div>
                      )}
                      {msg.voice_url && <audio controls preload="metadata" src={msg.voice_url} className="mt-2 h-10 max-w-full" />}
                    </>
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
                  {mine && index === thread.length - 1 && !isEditing && (
                    <div className={`mt-1 text-right text-[11px] font-medium ${
                      peerLastReadAt && new Date(peerLastReadAt).getTime() >= new Date(msg.created_at).getTime()
                        ? 'text-emerald-700'
                        : 'text-neutral-500'
                    }`}>
                      {peerLastReadAt && new Date(peerLastReadAt).getTime() >= new Date(msg.created_at).getTime()
                        ? 'Letto'
                        : 'Non letto'}
                    </div>
                  )}
                  {!!msg.reactions?.length && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Array.from(new Set(msg.reactions.map((reaction) => reaction.emoji))).map((emoji) => {
                        const reactions = msg.reactions?.filter((reaction) => reaction.emoji === emoji) || [];
                        const reactedByMe = reactions.some((reaction) => reaction.profile_id === currentProfileId);
                        return <button key={emoji} type="button" onClick={() => void handleReaction(msg.id, emoji)} className={`rounded-full border px-2 py-0.5 text-sm ${reactedByMe ? 'border-[var(--brand)] bg-[var(--brand)]/10' : 'border-neutral-200 bg-white'}`}>{emoji}{reactions.length > 1 ? ` ${reactions.length}` : ''}</button>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div className={`flex-none space-y-2 border-t bg-white ${isDock ? 'px-4 py-3' : 'px-5 py-4'}`}>
        {sendError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sendError}
          </div>
        )}
        {attachmentPreview && (
          <div className="relative w-fit rounded-xl border border-neutral-200 bg-neutral-50 p-2 pb-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentPreview} alt="Anteprima foto da inviare" className="h-24 w-24 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Rimuovi foto"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-lg text-white shadow"
            >
              ×
            </button>
            <span className="absolute bottom-1 left-2 text-[11px] text-neutral-500">Sarà ottimizzata automaticamente</span>
          </div>
        )}
        {voicePreviewUrl && (
          <div className="flex items-center gap-2 rounded-lg border bg-neutral-50 p-2">
            <audio controls src={voicePreviewUrl} className="h-10 flex-1" />
            <button type="button" onClick={() => setVoice(null)} aria-label="Rimuovi messaggio vocale" className="rounded-full px-2 py-1 hover:bg-neutral-200">×</button>
          </div>
        )}
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="sr-only"
              onChange={(event) => void selectAttachment(event.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => void selectAttachment(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={sending || optimizingAttachment}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
              aria-label="Allega una foto"
            >
              <span aria-hidden="true">📎</span><span className="hidden sm:inline">Allega foto</span><span className="sm:hidden">Foto</span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300 text-xl hover:bg-neutral-50" aria-label="Aggiungi emoji">😊</button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-xl border bg-white p-3 shadow-xl">
                  {CHAT_EMOJIS.map((emoji, index) => (
                    <button key={`${emoji}-${index}`} type="button" onClick={() => { setContent((value) => value + emoji); setShowEmojiPicker(false); }} className="rounded p-1 text-xl hover:bg-neutral-100">{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => void toggleRecording()} disabled={sending || optimizingAttachment} className={`inline-flex h-10 items-center justify-center gap-1 rounded-md border px-3 text-sm ${recording ? 'border-red-300 bg-red-50 text-red-700' : 'border-neutral-300 hover:bg-neutral-50'}`} aria-label={recording ? 'Termina registrazione' : 'Registra messaggio vocale'}>
              🎤 {recording ? `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')} Stop` : <span className="hidden sm:inline">Vocale</span>}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={sending || optimizingAttachment}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 sm:hidden"
              aria-label="Scatta una foto"
            >
              <span aria-hidden="true">📷</span><span>Fotocamera</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={(!content.trim() && !attachment && !voice) || sending || optimizingAttachment || recording}
            className="rounded-md bg-[var(--brand,#0ea5e9)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong,#0284c7)] hover:text-white hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#0ea5e9)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {optimizingAttachment ? 'Ottimizzo…' : sending ? 'Invio…' : 'Invia'}
          </button>
        </div>
      </div>
      {lightboxUrl ? (
        <Lightbox
          items={[{ url: lightboxUrl, type: 'image', alt: 'Foto allegata al messaggio' }]}
          index={0}
          onClose={() => setLightboxUrl(null)}
        />
      ) : null}
    </div>
  );
}
