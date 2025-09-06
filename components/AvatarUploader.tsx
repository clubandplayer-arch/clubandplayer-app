'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getExt(file: File) {
  const m = file.type.split('/')[1];
  if (m) return m.toLowerCase();
  const n = file.name.toLowerCase();
  if (n.endsWith('.png')) return 'png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg';
  if (n.endsWith('.webp')) return 'webp';
  return 'bin';
}

export default function AvatarUploader() {
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Carica user + path avatar corrente
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe({ id: user.id, email: user.email ?? undefined });

      // prendi path salvato su profiles.avatar_url
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && data?.avatar_url) {
        setAvatarPath(data.avatar_url);
      }
    })();
  }, []);

  // Genera signed URL quando abbiamo un path
  useEffect(() => {
    (async () => {
      if (!avatarPath) { setPreviewUrl(null); return; }
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .createSignedUrl(avatarPath, 60 * 60); // 1 ora
      if (error) { setError(error.message); return; }
      setPreviewUrl(data?.signedUrl ?? null);
    })();
  }, [avatarPath]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File troppo grande (max 2 MB).');
      e.currentTarget.value = '';
      return;
    }
    if (!me) {
      setError('Non sei loggato. Vai al login.');
      return;
    }

    setBusy(true);
    try {
      const ext = getExt(file);
      const path = `${me.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}.${ext}`;

      // Upload (sovrascriviamo se ri-carichi)
      const { error: upErr } = await supabase
        .storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      // Aggiorna profilo
      const { error: upProfErr } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', me.id);

      if (upProfErr) throw upProfErr;

      setAvatarPath(path);
    } catch (err: any) {
      setError(err?.message ?? 'Errore upload');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!me) {
    return (
      <div className="rounded-2xl border p-4">
        <p className="text-sm">Non sei loggato.</p>
        <a className="underline" href="/login">Vai al login</a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={previewUrl ?? '/avatar-placeholder.png'}
          alt="Avatar"
          className="h-24 w-24 rounded-full object-cover border"
        />
        <div className="flex-1">
          <p className="text-sm text-gray-600">Loggato come <b>{me.email ?? me.id}</b></p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            disabled={busy}
            className="mt-2 block"
          />
          <p className="text-xs text-gray-500 mt-1">PNG/JPG/WebP, max 2 MB</p>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
      <div className="text-xs text-gray-500">
        {avatarPath ? <>Path: <code>{avatarPath}</code></> : 'Nessun avatar caricato.'}
      </div>
    </div>
  );
}
