'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

type Props = {
  onPosted?: () => void;
};

const MAX_CHARS = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

type MediaType = 'image' | 'video';

export default function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canSend = (text.trim().length > 0 || Boolean(mediaFile)) && !sending;

  const textareaId = 'feed-composer-input';
  const helperId = 'feed-composer-helper';
  const errorId = err ? 'feed-composer-error' : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  function resetMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaFile(null);
    setMediaType(null);
    setMediaErr(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  async function uploadMedia(): Promise<{ media_url: string; media_type: MediaType } | null> {
    if (!mediaFile || !mediaType) return null;
    const form = new FormData();
    form.append('file', mediaFile);
    form.append('kind', mediaType);
    const res = await fetch('/api/feed/upload', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const json = await res.json().catch(() => null as any);
    if (!res.ok || !json?.ok || !json?.url) {
      throw new Error(json?.message || 'Upload media fallito');
    }
    return { media_url: json.url as string, media_type: (json.mediaType as MediaType) ?? mediaType };
  }

  async function handlePost() {
    if (!canSend) return;
    setSending(true);
    setErr(null);
    try {
      let mediaPayload: { media_url: string; media_type: MediaType } | null = null;
      if (mediaFile) {
        mediaPayload = await uploadMedia();
      }

      const payload: Record<string, any> = { content: text.trim() };
      if (mediaPayload) {
        payload.media_url = mediaPayload.media_url;
        payload.media_type = mediaPayload.media_type;
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
      setErr(null);
      onPosted?.();
    } catch (e: any) {
      setErr(e?.message ?? 'Errore inatteso');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm" aria-live="polite">
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
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          maxLength={MAX_CHARS}
          aria-describedby={describedBy}
          aria-invalid={Boolean(err)}
        />
        <p id={helperId} className="text-xs text-gray-500">
          {text.trim().length}/{MAX_CHARS} caratteri disponibili
        </p>

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
    </div>
  );
}
