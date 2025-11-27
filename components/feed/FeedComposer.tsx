'use client';

/* eslint-disable @next/next/no-img-element */

import type React from 'react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { MaterialIcon } from '@/components/icons/MaterialIcon';

type Props = {
  onPosted?: () => void;
};

const MAX_CHARS = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

type VideoAspect = '16:9' | '9:16';

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
  media_aspect?: VideoAspect;
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

export default function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [videoAspect, setVideoAspect] = useState<VideoAspect>('16:9');
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
  const canSend = (text.trim().length > 0 || Boolean(mediaFile) || Boolean(linkUrl)) && !sending;
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
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  useEffect(() => {
    return () => {
      if (eventPosterPreview) URL.revokeObjectURL(eventPosterPreview);
    };
  }, [eventPosterPreview]);

  function resetMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaFile(null);
    setMediaType(null);
    setVideoAspect('16:9');
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

  function findFirstUrl(value: string): string | null {
    const match = value.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setMediaErr(null);
    if (!file) {
      resetMedia();
      return;
    }
    const kind: MediaType | null = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
    if (!kind) {
      setMediaErr('Formato non supportato. Usa JPEG/PNG/WebP o MP4.');
      e.target.value = '';
      return;
    }
    const allowedList = kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
    if (!allowedList.includes(file.type)) {
      setMediaErr('Formato non supportato. Usa JPEG/PNG/WebP o MP4.');
      e.target.value = '';
      return;
    }
    const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      setMediaErr(`Il file supera il limite di ${Math.round(limit / (1024 * 1024))}MB.`);
      e.target.value = '';
      return;
    }
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaType(kind);
    setMediaPreview(kind === 'image' ? URL.createObjectURL(file) : null);
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

  async function uploadMedia(): Promise<UploadedMedia | null> {
    if (!mediaFile || !mediaType) return null;
    setMediaErr(null);
    const supabase = getSupabaseBrowserClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      const fallback = 'Effettua il login per allegare media.';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const allowedList = mediaType === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
    if (!allowedList.includes(mediaFile.type)) {
      const fallback =
        mediaType === 'image'
          ? 'Formato immagine non supportato. Usa JPEG/PNG/WebP/GIF.'
          : 'Formato video non supportato. Usa un file MP4.';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const limit = mediaType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (mediaFile.size > limit) {
      const fallback = `Il file supera il limite di ${Math.round(limit / (1024 * 1024))}MB.`;
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const safeName = sanitizeFileName(mediaFile.name);
    const objectPath = `${auth.user.id}/${Date.now()}-${safeName}`;
    const bucket = POSTS_BUCKET;

    const { data, error } = await supabase.storage.from(bucket).upload(objectPath, mediaFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: mediaFile.type || undefined,
    });

    if (error || !data) {
      const fallback = error?.message ? `Upload non riuscito: ${error.message}` : 'Upload media fallito';
      setMediaErr(fallback);
      throw new FeedUploadError(fallback);
    }

    const publicInfo = supabase.storage.from(bucket).getPublicUrl(data.path);
    let url = publicInfo?.data?.publicUrl ?? null;
    if (url && mediaType === 'video') {
      const glue = url.includes('?') ? '&' : '?';
      url = `${url}${glue}aspect=${videoAspect.replace(':', '-')}`;
    }

    return {
      media_url: url,
      media_type: mediaType,
      media_path: data.path,
      media_bucket: bucket,
      media_mime: mediaFile.type || null,
      ...(mediaType === 'video' ? { media_aspect: videoAspect } : {}),
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
      let mediaPayload: UploadedMedia | null = null;
      if (mediaFile) {
        mediaPayload = await uploadMedia();
      }

      const trimmed = text.trim();
      const payload: Record<string, any> = { content: trimmed };
      if (mediaPayload) {
        payload.media_url = mediaPayload.media_url;
        payload.media_type = mediaPayload.media_type;
        payload.media_path = mediaPayload.media_path;
        payload.media_bucket = mediaPayload.media_bucket;
        payload.media_mime = mediaPayload.media_mime;
        if (mediaPayload.media_type === 'video') {
          payload.media_aspect = videoAspect;
        }
      }
      if (linkUrl) {
        payload.link_url = linkUrl;
        payload.link_title = linkPreview?.title ?? null;
        payload.link_description = linkPreview?.description ?? null;
        payload.link_image = linkPreview?.image ?? null;
      }

      if (!trimmed && !mediaPayload && !linkUrl) {
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
        const msg =
          json?.message || json?.error || 'Impossibile pubblicare il post: riprova più tardi.';
        throw new Error(msg);
      }
      setText('');
      resetMedia();
      resetLink();
      setErr(null);
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
        const msg = json?.message || json?.error || 'Impossibile creare l\'evento.';
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
            {mediaFile ? (
              <span className="text-gray-700">
                {mediaFile.name} ({mediaType === 'image' ? 'immagine' : 'video'})
              </span>
            ) : (
              <span>Immagini (max 8MB) o video MP4 (max 80MB)</span>
            )}
          </div>
          {mediaFile && mediaType === 'video' ? (
            <div
              className="flex items-center gap-3 text-xs text-gray-700"
              aria-live="polite"
              role="radiogroup"
              aria-label="Formato video"
            >
              <span className="font-semibold">Formato:</span>
              {(
                [
                  { value: '16:9' as VideoAspect, label: '16:9', shape: 'h-6 w-10' },
                  { value: '9:16' as VideoAspect, label: '9:16', shape: 'h-10 w-6' },
                ] as const
              ).map((option) => {
                const isActive = videoAspect === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-pressed={isActive}
                    tabIndex={isActive ? 0 : -1}
                    disabled={sending}
                    onClick={() => setVideoAspect(option.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-semibold transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 ${
                      isActive
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex items-center justify-center rounded-md border border-current bg-black/10 ${option.shape}`}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
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
              <MaterialIcon name="calendar" className="h-4 w-4" fontSize="small" aria-hidden />
              <span>Crea evento</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setText('');
              setErr(null);
              resetMedia();
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

        {mediaPreview && (
          <div className="mt-3 overflow-hidden rounded-xl border bg-neutral-50">
            <img src={mediaPreview} alt="Anteprima immagine" className="w-full max-h-80 object-cover" />
            <button
              type="button"
              onClick={resetMedia}
              className="block w-full border-t px-3 py-2 text-left text-xs hover:bg-gray-50"
              disabled={sending}
            >
              Rimuovi immagine
            </button>
          </div>
        )}
        {mediaFile && mediaType === 'video' && (
          <div className="mt-3 rounded-xl border px-3 py-2 text-xs text-gray-600">
            File video pronto all'upload: {mediaFile.name}
            <button
              type="button"
              onClick={resetMedia}
              className="ml-2 underline"
              disabled={sending}
            >
              Rimuovi
            </button>
          </div>
        )}
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
                <MaterialIcon name="calendar" className="h-4 w-4" fontSize="small" aria-hidden />
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
