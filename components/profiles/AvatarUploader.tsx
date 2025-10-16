'use client';

import { useRef, useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Placeholder inline (niente asset esterni)
const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><rect width="100%" height="100%" fill="%23e5e7eb"/><circle cx="128" cy="110" r="60" fill="%23cbd5e1"/><rect x="48" y="220" width="160" height="40" rx="20" fill="%23cbd5e1"/></svg>';

type Props = { value?: string | null; onChange?: (url: string | null) => void; };

export default function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() { inputRef.current?.click(); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Seleziona un\'immagine.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5MB.'); return; }

    setError(null); setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Utente non autenticato');
      const uid = auth.user.id;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
      const path = `${uid}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });

      onChange?.(url);
    } catch (err: any) {
      setError(err?.message || 'Errore upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function removeAvatar() {
    setUploading(true); setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Utente non autenticato');
      const uid = auth.user.id;

      const { data: files } = await supabase.storage.from('avatars').list(uid);
      const toDelete = (files ?? []).filter(f => f.name.startsWith('avatar.')).map(f => `${uid}/${f.name}`);
      if (toDelete.length) await supabase.storage.from('avatars').remove(toDelete);

      await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      });

      onChange?.(null);
    } catch (err: any) {
      setError(err?.message || 'Errore rimozione');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-5">
      {/* Wrapper con ratio 4:5 e dimensioni grandi (≈ 192×240) */}
      <div className="relative w-48" style={{ aspectRatio: '4 / 5' }}>
        <img
          src={value || PLACEHOLDER}
          alt="Avatar"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover border bg-gray-100"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={openPicker} disabled={uploading}>
            {uploading ? 'Caricamento…' : 'Carica foto'}
          </button>
          {value && (
            <button type="button" className="btn" onClick={removeAvatar} disabled={uploading}>
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Formato consigliato: verticale (4:5), fino a 5MB.
        </p>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
