'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      '[AvatarUploader] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY non configurati'
    );
    return null;
  }

  try {
    return createBrowserClient(url, key);
  } catch (err) {
    console.error('[AvatarUploader] errore creazione client', err);
    return null;
  }
}

export default function AvatarUploader({ value, onChange }: Props) {
  const [supabase] = useState(() => createSupabaseClient());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!supabase) {
      setError(
        'Configurazione Supabase mancante. Contatta il supporto.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (max 10MB).');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Sessione non valida. Effettua di nuovo l’accesso.');
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[AvatarUploader] upload error', uploadError);
        if (
          uploadError.message &&
          uploadError.message.toLowerCase().includes('row-level security')
        ) {
          throw new Error(
            'Permesso negato dalle regole di sicurezza. Verifica le policy del bucket avatars.'
          );
        }
        throw new Error(
          uploadError.message ||
            'Errore durante il caricamento sullo storage.'
        );
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const publicUrl = publicData?.publicUrl || null;
      if (!publicUrl) {
        throw new Error(
          'Impossibile ottenere URL pubblico dell’immagine.'
        );
      }

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(
          '[AvatarUploader] PATCH /api/profiles/me failed',
          json
        );
        const msg =
          json?.details ||
          json?.error ||
          'Impossibile salvare la foto profilo.';
        throw new Error(msg);
      }

      onChange(publicUrl);
    } catch (err: any) {
      console.error('[AvatarUploader] error', err);
      setError(
        typeof err?.message === 'string' && err.message
          ? err.message
          : 'Errore durante il caricamento.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-start gap-4">
      {/* Preview 4:5, stessa della mini-card */}
      <div className="flex h-28 w-22 items-center justify-center overflow-hidden rounded-2xl border bg-gray-50">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <div className="h-14 w-14 rounded-full bg-gray-200" />
            <div className="h-2 w-16 rounded-full bg-gray-200" />
          </div>
        )}
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-900">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? 'Caricamento...' : 'Carica nuova immagine'}
        </label>
        <div>
          Immagine verticale 4:5 consigliata. Max 10MB.
          Formati supportati: JPG/PNG.
        </div>
        {error && (
          <div className="text-[11px] text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
