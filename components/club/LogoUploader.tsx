'use client';

import { useRef, useState } from 'react';

type Props = {
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
};

export default function LogoUploader({ initialUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handlePick() {
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setErr(null);
    // limiti base: 2MB e solo png/jpg
    if (file.size > 2 * 1024 * 1024) {
      setErr('Il file supera 2MB.');
      return;
    }
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setErr('Formato non valido. Usa PNG o JPG.');
      return;
    }

    // preview locale
    setPreview(URL.createObjectURL(file));

    // upload
    const fd = new FormData();
    fd.append('file', file);

    try {
      setUploading(true);
      const r = await fetch('/api/club/logo', { method: 'POST', body: fd, credentials: 'include' });
      const t = await r.text();
      if (!r.ok) {
        try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${r.status}`); }
        catch { throw new Error(t || `HTTP ${r.status}`); }
      }
      const j = JSON.parse(t) as { url: string };
      setPreview(j.url);
      onUploaded?.(j.url);
    } catch (e: any) {
      setErr(e?.message || 'Upload fallito');
    } finally {
      setUploading(false);
      // pulisci l'input, così puoi ricaricare lo stesso file
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-xl bg-gray-100 border overflow-hidden flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-500">Nessun logo</span>
        )}
      </div>

      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? 'Caricamento…' : 'Carica logo'}
        </button>
        <div className="text-[11px] text-gray-500">PNG/JPG quadrato ≤ 2MB.</div>
        {err && <div className="text-xs text-red-600">{err}</div>}
      </div>
    </div>
  );
}
