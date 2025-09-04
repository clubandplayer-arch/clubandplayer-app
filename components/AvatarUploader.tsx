'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const BUCKET = 'avatars';

export default function AvatarUploader() {
  const supabase = supabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const path = userId ? `${userId}/avatar` : null;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) { setErr(error.message); return; }
      setUserId(data.user?.id ?? null);
    })();
  }, [supabase]);

  async function refreshSignedUrl() {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) { setImgUrl(null); return; }
    setImgUrl(data.signedUrl);
  }

  useEffect(() => { if (path) refreshSignedUrl(); }, [path]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !path) return;
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      await refreshSignedUrl();
    } catch (e: any) {
      setErr(e?.message ?? 'Errore upload avatar');
    } finally {
      setBusy(false);
      e.currentTarget.value = '';
    }
  }

  async function onDelete() {
    if (!path) return;
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      setImgUrl(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore delete avatar');
    } finally {
      setBusy(false);
    }
  }

  if (!userId) return <p className="text-sm text-gray-500">Effettua l’accesso…</p>;

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 overflow-hidden rounded-full border bg-gray-50">
          {imgUrl ? (
            <img src={imgUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              nessun avatar
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <label className="cursor-pointer rounded-md border px-3 py-1 text-sm">
            {busy ? 'Caricamento…' : 'Carica'}
            <input type="file" accept="image/*" className="hidden"
                   onChange={onFileChange} disabled={busy} />
          </label>
          <button type="button" onClick={onDelete}
                  disabled={busy || !imgUrl}
                  className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">
            Elimina
          </button>
        </div>

        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}
