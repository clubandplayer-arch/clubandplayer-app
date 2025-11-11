'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (max 10MB).');
      return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `avatars/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    try {
      setUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[AvatarUploader] upload error', uploadError);
        throw new Error('Errore durante il caricamento.');
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

      // Aggiorna profilo server-side
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
        throw new Error(
          json?.error ||
            'Impossibile salvare la foto profilo.'
        );
      }

      onChange(publicUrl);
    } catch (err: any) {
      console.error('[AvatarUploader] error', err);
      setError(
        err?.message ||
          'Errore durante il caricamento della foto.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-48 w-36 items-center justify-center overflow-hidden rounded-3xl border bg-gray-50">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <div className="h-16 w-16 rounded-full bg-gray-200" />
            <div className="h-3 w-20 rounded-full bg-gray-200" />
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
          {uploading
            ? 'Caricamento...'
            : 'Carica nuova immagine'}
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
