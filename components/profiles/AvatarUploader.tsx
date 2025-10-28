/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState, useCallback } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Cropper, { Area } from 'react-easy-crop';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Placeholder verticale 4:5 (no asset esterni)
const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><rect width="100%" height="100%" fill="%23e5e7eb"/><circle cx="128" cy="120" r="60" fill="%23cbd5e1"/><rect x="48" y="220" width="160" height="40" rx="20" fill="%23cbd5e1"/></svg>';

type Props = {
  value?: string | null;
  onChange?: (url: string | null) => void;
};

/** Crea un Blob JPEG ritagliando l'immagine sorgente secondo i pixel dell'area */
async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc; // data URL (no CORS issue)
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height, // from source
    0, 0, canvas.width, canvas.height        // to canvas
  );

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92)
  );
  return blob;
}

export default function AvatarUploader({ value, onChange }: Props) {
  // Stato generale
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor di ritaglio
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null); // dataURL del file scelto
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  function openPicker() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { setError('Seleziona un\'immagine.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Dimensione massima 10MB.'); return; }

    setError(null);

    // Leggi il file come dataURL per il crop client-side
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1.2);
      setCrop({ x: 0, y: 0 });
    };
    reader.onerror = () => setError('Impossibile leggere il file');
    reader.readAsDataURL(file);
  }

  async function saveCroppedAndUpload() {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setError(null);
    try {
      // 1) genera blob ritagliato JPEG
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      // 2) user id + ruolo → path coerente con policy (profiles/<uid>/avatar.jpg oppure clubs/<uid>/avatar.jpg)
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr || !auth?.user) throw new Error('Utente non autenticato');
      const uid = auth.user.id;
      const role = auth.user.user_metadata?.role === 'club' ? 'club' : 'athlete';

      const base = role === 'club' ? `clubs/${uid}` : `profiles/${uid}`;
      const path = `${base}/avatar.jpg`;

      // 3) overwrite a percorso fisso (upsert)
      const { error: upErr } = await supabase
        .storage.from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      // 4) public URL + bust cache
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}${pub.publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

      // 5) salva su profilo (API esistente: /api/profiles)
      await fetch('/api/profiles', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      });

      // 6) aggiorna e chiudi editor
      onChange?.(url);
      setImageSrc(null);
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
      const { data: auth, error: ue } = await supabase.auth.getUser();
      if (ue || !auth?.user) throw new Error('Utente non autenticato');
      const uid = auth.user.id;
      const role = auth.user.user_metadata?.role === 'club' ? 'club' : 'athlete';
      const base = role === 'club' ? `clubs/${uid}` : `profiles/${uid}`;

      // Elimina tutti i file avatar.* nella cartella corretta
      const { data: files } = await supabase.storage.from('avatars').list(base);
      const toDelete = (files ?? []).filter(f => f.name.startsWith('avatar.')).map(f => `${base}/${f.name}`);
      if (toDelete.length) await supabase.storage.from('avatars').remove(toDelete);

      await fetch('/api/profiles', {
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
    <div className="flex items-start gap-6">
      {/* Anteprima grande 4:5 (≈ 256×320) */}
      <div className="relative w-64 shrink-0" style={{ aspectRatio: '4 / 5' }}>
        <img
          src={value || PLACEHOLDER}
          alt="Avatar"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover border bg-gray-100"
        />
      </div>

      <div className="flex flex-col gap-3 pt-1 min-w-[220px]">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={openPicker} disabled={uploading}>
            Scegli immagine
          </button>
          {value && (
            <button type="button" className="btn" onClick={removeAvatar} disabled={uploading}>
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Ritaglia e ridimensiona per adattare l&apos;immagine allo spazio 4:5. (Max 10MB)
        </p>
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      {/* Editor di ritaglio inline (appare dopo scelta file) */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-base font-semibold">Ritaglia immagine (4:5)</h3>
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={4 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                restrictPosition={true}
                zoomWithScroll={true}
                showGrid={false}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs text-gray-600">Zoom</label>
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

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setImageSrc(null); setError(null); }}
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

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
