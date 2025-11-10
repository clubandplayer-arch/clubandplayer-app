/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState, useCallback } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Cropper, { Area } from 'react-easy-crop';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Placeholder verticale 4:5 inline (niente asset esterni)
const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><rect width="100%" height="100%" fill="%23e5e7eb"/><circle cx="128" cy="120" r="60" fill="%23cbd5e1"/><rect x="48" y="220" width="160" height="40" rx="20" fill="%23cbd5e1"/></svg>';

type Props = {
  value?: string | null;
  onChange?: (url: string | null) => void;
};

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error('Impossibile creare il blob'));
      resolve(b);
    }, 'image/jpeg', 0.92);
  });

  return blob;
}

export default function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  function openPicker() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Seleziona un\'immagine valida.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dimensione massima 10MB.');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1.2);
      setCrop({ x: 0, y: 0 });
    };
    reader.onerror = () => setError('Impossibile leggere il file selezionato.');
    reader.readAsDataURL(file);
  }

  async function saveCroppedAndUpload() {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) throw new Error('Utente non autenticato');

      const uid = auth.user.id;
      const metaRole = String(auth.user.user_metadata?.role || '').toLowerCase();
      const base = metaRole === 'club' ? `clubs/${uid}` : `profiles/${uid}`;
      const path = `${base}/avatar.jpg`;

      const { error: upErr } = await supabase
        .storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: 'image/jpeg',
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const rawUrl = pub?.publicUrl;
      if (!rawUrl) throw new Error('Impossibile ottenere URL pubblico');

      const url =
        rawUrl + (rawUrl.includes('?') ? '&' : '?') + `v=${Date.now()}`;

      await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });

      onChange?.(url);
      setImageSrc(null);
    } catch (err: any) {
      console.error('[AvatarUploader] upload error', err);
      setError(err?.message || 'Errore durante il caricamento dell\'avatar.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setError(null);

    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) throw new Error('Utente non autenticato');

      const uid = auth.user.id;
      const metaRole = String(auth.user.user_metadata?.role || '').toLowerCase();
      const base = metaRole === 'club' ? `clubs/${uid}` : `profiles/${uid}`;

      const { data: files } = await supabase
        .storage
        .from('avatars')
        .list(base);

      const toDelete =
        (files || [])
          .filter((f) => f.name.startsWith('avatar'))
          .map((f) => `${base}/${f.name}`);

      if (toDelete.length) {
        await supabase.storage.from('avatars').remove(toDelete);
      }

      await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      });

      onChange?.(null);
    } catch (err: any) {
      console.error('[AvatarUploader] remove error', err);
      setError(err?.message || 'Errore durante la rimozione dell\'avatar.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-6">
      <div
        className="relative w-40 md:w-56 shrink-0"
        style={{ aspectRatio: '4 / 5' }}
      >
        <img
          src={value || PLACEHOLDER}
          alt="Avatar"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover border bg-gray-100"
        />
      </div>

      <div className="flex flex-col gap-3 pt-1 min-w-[220px]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className="btn"
          >
            {uploading ? 'Caricamento…' : 'Carica nuova immagine'}
          </button>
          {value && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={uploading}
              className="btn btn-outline"
            >
              Rimuovi
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Immagine verticale 4:5 consigliata. Max 10MB. Formati supportati:
          JPG/PNG.
        </p>

        {error && (
          <p className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl space-y-4">
            <h2 className="text-sm font-medium">
              Ritaglia il tuo avatar
            </h2>

            <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black/5">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={4 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                restrictPosition
                zoomWithScroll
                showGrid={false}
              />
            </div>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-600">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setImageSrc(null);
                  setError(null);
                }}
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn"
                onClick={saveCroppedAndUpload}
                disabled={uploading}
              >
                {uploading ? 'Salvo…' : 'Salva ritaglio'}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
