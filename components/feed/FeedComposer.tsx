'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';

type Props = {
  onPosted?: () => void;
};

type Mode = 'text' | 'photo' | 'video';

export default function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<Mode>('text');

  const canSend = (text.trim().length > 0 || (!!file && mode !== 'text')) && !sending && !uploading;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onSelectFile(f: File | null) {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setErr(null);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function uploadMedia(): Promise<{ url: string; kind: 'image' | 'video' } | null> {
    if (!file) return null;

    const kind = mode === 'video' || file.type.startsWith('video') ? 'video' : 'image';
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);

    setUploading(true);
    try {
      const res = await fetch('/api/feed/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const msg = json?.message || json?.error || 'Upload fallito';
        throw new Error(msg);
      }

      return { url: json.url as string, kind };
    } finally {
      setUploading(false);
    }
  }

  async function handlePost() {
    if (!canSend) return;
    setSending(true);
    setErr(null);
    try {
      if (mode !== 'text' && !file) {
        throw new Error('Aggiungi un allegato prima di pubblicare');
      }

      let media: { url: string; kind: 'image' | 'video' } | null = null;

      if (file) {
        media = await uploadMedia();
      }

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), media_url: media?.url, media_type: media?.kind }),
      });

      const json = await res.json().catch(() => null as any);
      if (!res.ok || !json?.ok) {
        const msg =
          json?.message || json?.error || 'Impossibile pubblicare il post: riprova più tardi.';
        throw new Error(msg);
      }
      setText('');
      onSelectFile(null);
      onPosted?.(); // ricarica lista
    } catch (e: any) {
      setErr(e?.message ?? 'Errore inatteso');
    } finally {
      setSending(false);
    }
  }

  function toggleMode(next: Mode) {
    setMode(next);
    setErr(null);
    if (next === 'text') {
      onSelectFile(null);
    } else if (file && next === 'photo' && file.type.startsWith('video')) {
      onSelectFile(null);
    } else if (file && next === 'video' && !file.type.startsWith('video')) {
      onSelectFile(null);
    }
  }

  const accept = mode === 'photo' ? 'image/*' : mode === 'video' ? 'video/*' : 'image/*,video/*';

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium text-gray-700">
        <button
          type="button"
          onClick={() => toggleMode('video')}
          className={`flex items-center gap-2 rounded-full px-3 py-1 ${
            mode === 'video' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <span role="img" aria-label="video">🎥</span>
          <span>Video</span>
        </button>
        <button
          type="button"
          onClick={() => toggleMode('photo')}
          className={`flex items-center gap-2 rounded-full px-3 py-1 ${
            mode === 'photo' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <span role="img" aria-label="foto">📷</span>
          <span>Foto</span>
        </button>
        <button
          type="button"
          onClick={() => toggleMode('text')}
          className={`flex items-center gap-2 rounded-full px-3 py-1 ${
            mode === 'text' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
          }`}
        >
          <span role="img" aria-label="testo">📝</span>
          <span>Cosa penso</span>
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {mode === 'text' ? (
          <textarea
            className="w-full resize-y rounded-2xl border px-3 py-3 text-sm outline-none focus:ring"
            rows={3}
            placeholder="Condividi un pensiero…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
        ) : (
          <div className="space-y-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-sm text-gray-600 hover:bg-gray-50">
              <input
                type="file"
                accept={accept}
                className="hidden"
                disabled={sending || uploading}
                onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-lg font-semibold">
                {mode === 'photo' ? 'Carica una foto' : 'Carica un video'}
              </span>
              <span className="text-xs text-gray-500">Trascina o clicca per selezionare</span>
            </label>
            {previewUrl && (
              <div className="overflow-hidden rounded-2xl border bg-neutral-50">
                {mode === 'video' ? (
                  <video src={previewUrl} controls className="max-h-80 w-full" />
                ) : (
                  <img src={previewUrl} alt="Anteprima" className="max-h-80 w-full object-cover" />
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
              {file ? <span>{file.name}</span> : <span>Nessun allegato</span>}
              {file && (
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => onSelectFile(null)}
                  disabled={uploading || sending}
                >
                  Rimuovi allegato
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setText('');
              onSelectFile(null);
              setErr(null);
            }}
            disabled={sending || uploading}
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
            {sending || uploading ? 'Invio…' : 'Pubblica'}
          </button>
        </div>

        {err && <div className="text-xs text-red-600">{err}</div>}
      </div>
    </div>
  );
}
