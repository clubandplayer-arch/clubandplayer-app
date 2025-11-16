'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Props = {
  onPosted?: () => void;
};

export default function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canSend = text.trim().length > 0 && !sending && !uploading;

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    try {
      return createBrowserClient(url, key);
    } catch (e) {
      console.error('[FeedComposer] errore creazione client', e);
      return null;
    }
  }, []);

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
    if (!supabase) {
      throw new Error('Storage non configurato');
    }

    const kind = file.type.startsWith('video') ? 'video' : 'image';
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_') || `${Date.now()}`;
      const path = `feed/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

      if (uploadError) {
        throw new Error(uploadError.message || 'Upload fallito');
      }

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = publicData?.publicUrl;
      if (!url) throw new Error('URL pubblico non disponibile');
      return { url, kind };
    } finally {
      setUploading(false);
    }
  }

  async function handlePost() {
    if (!canSend) return;
    setSending(true);
    setErr(null);
    try {
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
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = 'Impossibile pubblicare';
        try {
          const j = JSON.parse(t);
          msg = j?.error || msg;
        } catch {}
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

  return (
    <div className="rounded-2xl border p-4">
      <textarea
        className="w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
        rows={3}
        placeholder="Condividi un aggiornamento…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 hover:bg-gray-50">
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={sending || uploading}
              onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
            />
            <span role="img" aria-label="media">📎</span>
            <span>Foto o video</span>
          </label>
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
        <button
          type="button"
          onClick={handlePost}
          disabled={!canSend}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {sending || uploading ? 'Invio…' : 'Pubblica'}
        </button>
      </div>

      {previewUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border bg-neutral-50">
          {file?.type.startsWith('video') ? (
            <video src={previewUrl} controls className="max-h-80 w-full" />
          ) : (
            <img src={previewUrl} alt="Anteprima" className="max-h-80 w-full object-cover" />
          )}
        </div>
      )}

      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
    </div>
  );
}
