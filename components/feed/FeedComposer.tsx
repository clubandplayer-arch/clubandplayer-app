'use client';

/* eslint-disable @next/next/no-img-element */

import type React from 'react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import type { FeedPost } from '@/components/feed/postShared';

type Props = {
  onPosted?: () => void;
  quotedPost?: FeedPost | null;
  onClearQuote?: () => void;
};

const MAX_CHARS = 500;
const MAX_MEDIA = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ACCEPT = 'image/*,video/*';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type MediaType = 'image' | 'video';

type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

type UploadedMedia = {
  media_url: string | null;
  media_type: MediaType;
  media_path: string;
  media_bucket: string;
  media_mime: string | null;
  poster_url?: string | null;
  width?: number | null;
  height?: number | null;
};

type MediaAttachment = {
  id: string;
  file: File;
  kind: MediaType;
  previewUrl: string;
  width?: number;
  height?: number;
  posterBlob?: Blob;
  posterPreviewUrl?: string;
};

const POSTS_BUCKET = process.env.NEXT_PUBLIC_POSTS_BUCKET || 'posts';

function sanitizeFileName(name?: string | null) {
  return (name || 'media')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    || 'media';
}

class FeedUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedUploadError';
  }
}

export default function FeedComposer({ onPosted, quotedPost, onClearQuote }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaAttachment[]>([]);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [accountType, setAccountType] = useState<'club' | 'athlete' | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventPoster, setEventPoster] = useState<File | null>(null);
  const [eventPosterPreview, setEventPosterPreview] = useState<string | null>(null);
  const [eventErr, setEventErr] = useState<string | null>(null);
  const [eventSending, setEventSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const eventFileInputRef = useRef<HTMLInputElement | null>(null);
  const linkAbortRef = useRef<AbortController | null>(null);
  const mediaItemsRef = useRef<MediaAttachment[]>([]);
  const canSend =
    (text.trim().length > 0 || mediaItems.length > 0 || Boolean(linkUrl) || Boolean(quotedPost)) && !sending;
  const isClub = accountType === 'club';

  const textareaId = 'feed-composer-input';
  const helperId = 'feed-composer-helper';
  const errorId = err ? 'feed-composer-error' : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  useEffect(() => {
    return () => {
      linkAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await res.json().catch(() => ({}));
        const data = (raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw) || {};
        const role = (data?.account_type || data?.type || '').toString().toLowerCase();
        if (role === 'club') setAccountType('club');
        else if (role === 'athlete') setAccountType('athlete');
      } catch {
        setAccountType(null);
      }
    })();
  }, []);

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.posterPreviewUrl) URL.revokeObjectURL(item.posterPreviewUrl);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (eventPosterPreview) URL.revokeObjectURL(eventPosterPreview);
    };
  }, [eventPosterPreview]);

  function resetMedia() {
    mediaItems.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.posterPreviewUrl) URL.revokeObjectURL(item.posterPreviewUrl);
    });
    setMediaItems([]);
    setMediaErr(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetLink() {
    linkAbortRef.current?.abort();
    setLinkUrl(null);
    setLinkPreview(null);
    setLinkErr(null);
    setLinkLoading(false);
  }

  function resetEventPoster() {
    if (eventPosterPreview) URL.revokeObjectURL(eventPosterPreview);
    setEventPosterPreview(null);
    setEventPoster(null);
    setEventErr(null);
    if (eventFileInputRef.current) eventFileInputRef.current.value = '';
  }

  function resetEventForm() {
    setEventTitle('');
    setEventDate('');
    setEventLocation('');
    setEventDescription('');
    resetEventPoster();
    setEventErr(null);
  }

  function removeMediaItem(id: string) {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.posterPreviewUrl) URL.revokeObjectURL(target.posterPreviewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  function findFirstUrl(value: string): string | null {
    const match = value.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  function createMediaId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function loadImageDimensions(url: string) {
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Impossibile leggere le dimensioni immagine.'));
    });
    img.src = url;
    return loaded;
  }

  async function generateVideoPoster(file: File) {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = videoUrl;
    video.muted = true;
    const metadata = await new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
      video.onloadedmetadata = () =>
        resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration || 0 });
      video.onerror = () => reject(new Error('Impossibile leggere i metadata del video.'));
    });
    const seekTime = metadata.duration ? Math.min(0.1, metadata.duration / 2) : 0;
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Impossibile estrarre il frame del video.'));
      video.currentTime = seekTime;
    });
    const canvas = document.createElement('canvas');
    canvas.width = metadata.width || 1;
    canvas.height = metadata.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(videoUrl);
      throw new Error('Impossibile generare il poster.');
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const posterBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Impossibile generare il poster.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.85,
      );
    });
    URL.revokeObjectURL(videoUrl);
    const posterPreviewUrl = URL.createObjectURL(posterBlob);
    return {
      posterBlob,
      posterPreviewUrl,
      width: metadata.width,
      height: metadata.height,
    };
  }

  async function fetchLinkPreview(url: string) {
    linkAbortRef.current?.abort();
    const controller = new AbortController();
    linkAbortRef.current = controller;
    setLinkLoading(true);
    setLinkErr(null);
    try {
      const res = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (json?.ok && json?.url) {
        setLinkPreview({
          url: json.url,
          title: json.title ?? null,
          description: json.description ?? null,
          image: json.image ?? null,
        });
      } else {
        setLinkPreview(null);
        setLinkErr(json?.message || 'Anteprima non disponibile');
      }
    } catch (error: any) {
      if (controller.signal.aborted) return;
      setLinkPreview(null);
      setLinkErr(error?.message || 'Anteprima non disponibile');
    } finally {
      if (!controller.signal.aborted) setLinkLoading(false);
    }
  }

  function handleTextChange(value: string) {
    setText(value);
    setErr(null);
    const found = findFirstUrl(value);
    if (!found) {
      resetLink();
      return;
    }
    if (found !== linkUrl) {
      setLinkUrl(found);
      setLinkPreview(null);
      setLinkErr(null);
      void fetchLinkPreview(found);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setMediaErr(null);
    if (!files.length) return;

    const nextItems: MediaAttachment[] = [];
    let errorMessage: string | null = null;
    let remainingSlots = Math.max(0, MAX_MEDIA - mediaItems.length);

    for (const file of files) {
      if (remainingSlots <= 0) {
        errorMessage = `Puoi caricare al massimo ${MAX_MEDIA} file.`;
        break;
      }
      const kind: MediaType | null = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'image'
          : null;
      if (!kind) {
        errorMessage = 'Formato non supportato. Seleziona immagini o video.';
        continue;
      }
      const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > limit) {
        errorMessage = `Il file supera il limite di ${Math.round(limit / (1024 * 1024))}MB.`;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const item: MediaAttachment = {
        id: createMediaId(),
        file,
        kind,
        previewUrl,
      };
      if (kind === 'image') {
        try {
          const dimensions = await loadImageDimensions(previewUrl);
          item.width = dimensions.width;
          item.height = dimensions.height;
        } catch {
          URL.revokeObjectURL(previewUrl);
          errorMessage = 'Impossibile leggere l\'immagine selezionata.';
          continue;
        }
      } else {
        try {
          const poster = await generateVideoPoster(file);
          item.posterBlob = poster.posterBlob;
          item.posterPreviewUrl = poster.posterPreviewUrl;
          item.width = poster.width;
          item.height = poster.height;
        } catch {
          URL.revokeObjectURL(previewUrl);
          errorMessage = 'Impossibile generare il poster del video.';
          continue;
        }
      }
      nextItems.push(item);
      remainingSlots -= 1;
    }

    if (nextItems.length) {
      setMediaItems((prev) => [...prev, ...nextItems]);
    }
    if (errorMessage) {
      setMediaErr(errorMessage);
    }
  }

  function handleEventPosterChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setEventErr(null);
    if (!file) {
      resetEventPoster();
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setEventErr('Carica un\'immagine (JPEG/PNG/WebP/GIF).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setEventErr('Il file supera il limite di 8MB.');
      e.target.value = '';
      return;
    }
    if (eventPosterPreview) URL.revokeObjectURL(eventPosterPreview);
    setEventPoster(file);
    setEventPosterPreview(URL.createObjectURL(file));
  }

  async function uploadMediaItem(item: MediaAttachment, userId: string, supabase = getSupabaseBrowserClient()) {
    const limit = item.kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (item.file.size > limit) {
      const fallback = `Il file supera il limite di ${Math.round(limit / (1024 * 1024))}MB.`;
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    if (item.kind === 'video' && !item.posterBlob) {
      const fallback = 'Poster video mancante.';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const safeName = sanitizeFileName(item.file.name);
    const objectPath = `${userId}/${Date.now()}-${safeName}`;
    const bucket = POSTS_BUCKET;
    const { data, error } = await supabase.storage.from(bucket).upload(objectPath, item.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: item.file.type || undefined,
    });

    if (error || !data) {
      const fallback = error?.message ? `Upload non riuscito: ${error.message}` : 'Upload media fallito';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const publicInfo = supabase.storage.from(bucket).getPublicUrl(data.path);
    const url = publicInfo?.data?.publicUrl ?? null;
    if (!url) {
      const fallback = 'Impossibile ottenere l\'URL del media.';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    let posterUrl: string | null = null;
    if (item.kind === 'video' && item.posterBlob) {
      const posterPath = `${userId}/posters/${Date.now()}-${safeName}.jpg`;
      const posterUpload = await supabase.storage.from(bucket).upload(posterPath, item.posterBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });
      if (posterUpload.error || !posterUpload.data) {
        const fallback = posterUpload.error?.message
          ? `Upload poster non riuscito: ${posterUpload.error.message}`
          : 'Upload poster fallito';
        setMediaErr(fallback);
        throw new FeedUploadError(fallback);
      }
      const posterInfo = supabase.storage.from(bucket).getPublicUrl(posterUpload.data.path);
      posterUrl = posterInfo?.data?.publicUrl ?? null;
      if (!posterUrl) {
        const fallback = 'Impossibile ottenere l\'URL del poster.';
        setMediaErr(fallback);
        throw new FeedUploadError(fallback);
      }
    }

    return {
      media_url: url,
      media_type: item.kind,
      media_path: data.path,
      media_bucket: bucket,
      media_mime: item.file.type || null,
      poster_url: posterUrl,
      width: item.width ?? null,
      height: item.height ?? null,
    };
  }

  async function uploadEventPoster(): Promise<UploadedMedia | null> {
    if (!eventPoster) return null;
    setEventErr(null);
    const supabase = getSupabaseBrowserClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      const fallback = 'Effettua il login per allegare media.';
      setEventErr(fallback);
      throw new FeedUploadError(fallback);
    }

    if (!IMAGE_TYPES.includes(eventPoster.type)) {
      const fallback = 'Carica un\'immagine JPEG/PNG/WebP/GIF.';
      setEventErr(fallback);
      throw new FeedUploadError(fallback);
    }

    if (eventPoster.size > MAX_IMAGE_BYTES) {
      const fallback = 'Il file supera il limite di 8MB.';
      setEventErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const safeName = sanitizeFileName(eventPoster.name);
    const objectPath = `${auth.user.id}/events/${Date.now()}-${safeName}`;
    const bucket = POSTS_BUCKET;

    const { data, error } = await supabase.storage.from(bucket).upload(objectPath, eventPoster, {
      cacheControl: '3600',
      upsert: false,
      contentType: eventPoster.type || undefined,
    });

    if (error || !data) {
      const fallback = error?.message ? `Upload non riuscito: ${error.message}` : 'Upload immagine fallito';
      setEventErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const publicInfo = supabase.storage.from(bucket).getPublicUrl(data.path);
    const url = publicInfo?.data?.publicUrl ?? null;

    return {
      media_url: url,
      media_type: 'image',
      media_path: data.path,
      media_bucket: bucket,
      media_mime: eventPoster.type || null,
    };
  }

  async function handlePost() {
    if (!canSend) return;
    setSending(true);
    setErr(null);
    try {
      const mediaPayloads: UploadedMedia[] = [];
      if (mediaItems.length) {
        const supabase = getSupabaseBrowserClient();
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr || !auth?.user) {
          const fallback = 'Effettua il login per allegare media.';
          setMediaErr(fallback);
          throw new FeedUploadError(fallback);
        }
        for (const item of mediaItems) {
          const uploaded = await uploadMediaItem(item, auth.user.id, supabase);
          mediaPayloads.push(uploaded);
        }
      }

      const trimmed = text.trim();
      const payload: Record<string, any> = { content: trimmed };
      if (mediaPayloads.length) {
        payload.media = mediaPayloads.map((item, index) => ({
          mediaType: item.media_type,
          url: item.media_url,
          posterUrl: item.poster_url ?? null,
          width: item.width ?? null,
          height: item.height ?? null,
          position: index,
        }));
      }
      if (linkUrl) {
        payload.link_url = linkUrl;
        payload.link_title = linkPreview?.title ?? null;
        payload.link_description = linkPreview?.description ?? null;
        payload.link_image = linkPreview?.image ?? null;
      }
      if (quotedPost) {
        payload.quotedPostId = quotedPost.id;
      }

      if (!trimmed && mediaPayloads.length === 0 && !linkUrl && !quotedPost) {
        setErr('Scrivi un testo o allega un media/link.');
        return;
      }

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) {
        const detail = json?.details?.message || json?.message || json?.error;
        const msg = detail || 'Impossibile pubblicare il post: riprova più tardi.';
        throw new Error(msg);
      }
      setText('');
      resetMedia();
      resetLink();
      setErr(null);
      onClearQuote?.();
      onPosted?.();
    } catch (e: any) {
      if (e?.name === 'FeedUploadError') {
        return;
      }
      setErr(e?.message ?? 'Errore inatteso');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateEvent() {
    const title = eventTitle.trim();
    const dateValue = eventDate.trim();
    const description = eventDescription.trim();
    const location = eventLocation.trim();

    if (!title || !dateValue) {
      setEventErr('Titolo e data sono obbligatori.');
      return;
    }

    setEventSending(true);
    setEventErr(null);
    try {
      const poster = eventPoster ? await uploadEventPoster() : null;
      const parsedDate = new Date(dateValue);
      const normalizedDate = Number.isNaN(parsedDate.getTime()) ? dateValue : parsedDate.toISOString();
      const payload: Record<string, any> = {
        kind: 'event',
        content: description,
        event_payload: {
          title,
          date: normalizedDate,
          location: location || null,
          description: description || null,
          poster_url: poster?.media_url ?? null,
          poster_path: poster?.media_path ?? null,
          poster_bucket: poster?.media_bucket ?? null,
        },
      };
      if (poster) {
        payload.media_url = poster.media_url;
        payload.media_type = poster.media_type;
        payload.media_path = poster.media_path;
        payload.media_bucket = poster.media_bucket;
        payload.media_mime = poster.media_mime;
      }

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) {
        const detail = json?.details?.message || json?.message || json?.error;
        const msg = detail || 'Impossibile creare l\'evento.';
        throw new Error(msg);
      }

      resetEventForm();
      setEventModalOpen(false);
      onPosted?.();
    } catch (e: any) {
      if (e?.name === 'FeedUploadError') {
        return;
      }
      setEventErr(e?.message ?? 'Errore inatteso durante la creazione evento');
    } finally {
      setEventSending(false);
    }
  }

  return (
    <div className="glass-panel p-4" aria-live="polite">
      <div className="mt-4 space-y-3">
        <label htmlFor={textareaId} className="sr-only">
          Scrivi un aggiornamento per la community
        </label>
        <textarea
          id={textareaId}
          className="w-full resize-y rounded-2xl border px-3 py-3 text-sm outline-none focus:ring"
          rows={3}
          placeholder="Condividi un pensiero…"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={sending}
          maxLength={MAX_CHARS}
          aria-describedby={describedBy}
          aria-invalid={Boolean(err)}
        />
        <p id={helperId} className="text-xs text-gray-500">
          {text.trim().length}/{MAX_CHARS} caratteri disponibili
        </p>

        {linkUrl ? (
          <LinkPreviewCard loading={linkLoading} preview={linkPreview} url={linkUrl} />
        ) : null}
        {linkErr ? (
          <div className="text-xs text-red-600" role="status">
            {linkErr}
          </div>
        ) : null}

        {quotedPost ? (
          <div className="mt-3">
            <QuotedPostCard
              post={quotedPost}
              onRemove={onClearQuote}
              missingText="Il post originale non è disponibile"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex flex-1 items-center gap-2 text-xs text-gray-500">
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              Allega foto/video
            </button>
            {mediaItems.length ? (
              <span className="text-gray-700">Allegati: {mediaItems.length}/{MAX_MEDIA}</span>
            ) : (
              <span>Immagini (max 8MB) o video (max 80MB)</span>
            )}
          </div>
          {isClub ? (
            <button
              type="button"
              onClick={() => {
                setEventModalOpen(true);
                setEventErr(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              disabled={sending}
            >
              <MaterialIcon name="calendar" fontSize={16} aria-hidden />
              <span>Crea evento</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setText('');
              setErr(null);
              resetMedia();
              onClearQuote?.();
            }}
            disabled={sending}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={!canSend}
            className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {sending ? 'Invio…' : 'Pubblica'}
          </button>
        </div>
        {mediaItems.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mediaItems.map((item) => (
              <div key={item.id} className="relative overflow-hidden rounded-xl border bg-neutral-50">
                {item.kind === 'image' ? (
                  <img src={item.previewUrl} alt="Anteprima immagine" className="h-36 w-full object-cover" />
                ) : (
                  <img
                    src={item.posterPreviewUrl || item.previewUrl}
                    alt="Anteprima video"
                    className="h-36 w-full object-cover"
                  />
                )}
                {item.kind === 'video' ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    VIDEO
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeMediaItem(item.id)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow"
                  disabled={sending}
                >
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {mediaErr && (
          <div className="text-xs text-red-600" role="status">
            {mediaErr}
          </div>
        )}
        {err && (
          <div id={errorId} className="text-xs text-red-600" role="status">
            {err}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
        multiple
      />
      <input
        ref={eventFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleEventPosterChange}
      />

      <Modal
        open={eventModalOpen}
        title="Crea evento"
        onClose={() => {
          resetEventForm();
          setEventModalOpen(false);
        }}
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label htmlFor="event-title" className="text-xs font-semibold uppercase text-gray-700">
              Titolo*
            </label>
            <input
              id="event-title"
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring"
              maxLength={120}
              placeholder="Nome dell'evento"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="event-date" className="text-xs font-semibold uppercase text-gray-700">
                Data*
              </label>
              <input
                id="event-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="event-location" className="text-xs font-semibold uppercase text-gray-700">
                Luogo (opzionale)
              </label>
              <input
                id="event-location"
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring"
                placeholder="Stadio, palestra, città…"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="event-description" className="text-xs font-semibold uppercase text-gray-700">
              Descrizione
            </label>
            <textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring"
              placeholder="Dettagli, programma, note…"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase text-gray-700">Locandina (opzionale)</div>
                <div className="text-[11px] text-gray-500">Immagine JPEG/PNG/WebP/GIF, max 8MB</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                onClick={() => eventFileInputRef.current?.click()}
                disabled={eventSending}
              >
                <MaterialIcon name="calendar" fontSize={16} aria-hidden />
                <span>Carica locandina</span>
              </button>
            </div>
            {eventPosterPreview ? (
              <div className="overflow-hidden rounded-xl border bg-neutral-50">
                <img src={eventPosterPreview} alt="Anteprima locandina" className="w-full max-h-80 object-contain" />
                <button
                  type="button"
                  onClick={resetEventPoster}
                  className="block w-full border-t px-3 py-2 text-left text-xs hover:bg-gray-50"
                  disabled={eventSending}
                >
                  Rimuovi locandina
                </button>
              </div>
            ) : null}
          </div>

          {eventErr ? (
            <div className="text-xs text-red-600" role="status">
              {eventErr}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                resetEventForm();
                setEventModalOpen(false);
              }}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              disabled={eventSending}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleCreateEvent}
              className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
              disabled={eventSending}
            >
              {eventSending ? 'Creazione…' : 'Pubblica evento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkPreviewCard({
  url,
  preview,
  loading,
}: {
  url: string;
  preview: LinkPreview | null;
  loading: boolean;
}) {
  return (
    <div className="glass-panel border px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">Anteprima link</span>
        {loading ? <span className="text-xs text-gray-500">Caricamento…</span> : null}
      </div>
      <a
        href={preview?.url || url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 block rounded-lg border bg-white/60 p-3 hover:border-gray-400"
      >
        <div className="flex gap-3">
          {preview?.image ? (
            <img
              src={preview.image}
              alt={preview.title || preview.url || url}
              className="h-16 w-24 flex-shrink-0 rounded-md object-cover"
            />
          ) : null}
          <div className="flex-1 space-y-1">
            <div className="text-xs uppercase text-gray-500">{domainFromUrl(preview?.url || url)}</div>
            <div className="text-sm font-semibold text-gray-900">{preview?.title || 'Link'}</div>
            {preview?.description ? (
              <div className="text-xs text-gray-600 line-clamp-2">{preview.description}</div>
            ) : null}
          </div>
        </div>
      </a>
    </div>
  );
}
