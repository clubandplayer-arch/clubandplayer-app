'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 500;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;
const MAX_ZOOM = 2.5;

type CropState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeCropParams(
  image: HTMLImageElement,
  { zoom, offsetX, offsetY }: CropState
) {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;

  if (!srcW || !srcH) {
    throw new Error('Dimensioni immagine non valide');
  }

  const srcRatio = srcW / srcH;
  const baseWidth = srcRatio > TARGET_RATIO ? srcH * TARGET_RATIO : srcW;

  const effectiveZoom = clamp(zoom, 1, MAX_ZOOM);
  const cropWidth = baseWidth / effectiveZoom;
  const cropHeight = cropWidth / TARGET_RATIO;

  const diffX = Math.max(0, srcW - cropWidth);
  const diffY = Math.max(0, srcH - cropHeight);

  const normX = clamp(offsetX, -1, 1);
  const normY = clamp(offsetY, -1, 1);

  const originX = diffX * ((normX + 1) / 2);
  const originY = diffY * ((normY + 1) / 2);

  return { cropWidth, cropHeight, originX, originY };
}

function renderAvatarPreview(
  image: HTMLImageElement,
  crop: CropState
): string {
  const { cropWidth, cropHeight, originX, originY } = computeCropParams(image, crop);
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossibile inizializzare il canvas');
  }

  ctx.drawImage(
    image,
    originX,
    originY,
    cropWidth,
    cropHeight,
    0,
    0,
    TARGET_WIDTH,
    TARGET_HEIGHT
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

async function createAvatarBlob(
  image: HTMLImageElement,
  crop: CropState
): Promise<Blob> {
  const { cropWidth, cropHeight, originX, originY } = computeCropParams(image, crop);
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossibile inizializzare il canvas');
  }

  ctx.drawImage(
    image,
    originX,
    originY,
    cropWidth,
    cropHeight,
    0,
    0,
    TARGET_WIDTH,
    TARGET_HEIGHT
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Impossibile generare il blob'));
      },
      'image/jpeg',
      0.9
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Impossibile leggere il file'));
    };
    reader.onerror = () => reject(reader.error || new Error('Errore lettura file'));
    reader.readAsDataURL(file);
  });
}

export default function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCrop, setEditorCrop] = useState<CropState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!editorOpen) return;
    const image = imageRef.current;
    if (!image) return;

    try {
      const url = renderAvatarPreview(image, editorCrop);
      setPreviewUrl(url);
    } catch (err) {
      console.error('[AvatarUploader] anteprima fallita', err);
    }
  }, [editorOpen, editorCrop]);

  function resetEditor() {
    setEditorOpen(false);
    setPreviewUrl(null);
    setEditorCrop({ zoom: 1, offsetX: 0, offsetY: 0 });
    imageRef.current = null;
    dragRef.current = null;
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (max 10MB).');
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Impossibile caricare l’immagine'));
        image.src = dataUrl;
      });

      imageRef.current = img;
      const initialCrop: CropState = { zoom: 1, offsetX: 0, offsetY: 0 };
      setEditorCrop(initialCrop);

      try {
        const preview = renderAvatarPreview(img, initialCrop);
        setPreviewUrl(preview);
      } catch (err) {
        console.error('[AvatarUploader] anteprima fallita', err);
        setPreviewUrl(null);
      }

      setEditorOpen(true);
    } catch (err: any) {
      console.error('[AvatarUploader] file error', err);
      setError(
        typeof err?.message === 'string' && err.message
          ? err.message
          : 'Impossibile elaborare il file selezionato.'
      );
    } finally {
      e.target.value = '';
    }
  }

  async function saveAvatar() {
    const image = imageRef.current;
    if (!image) {
      setError('Nessuna immagine da caricare. Seleziona un file.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const avatarBlob = await createAvatarBlob(image, editorCrop);
      const form = new FormData();
      form.append('file', avatarBlob, 'avatar.jpg');

      const res = await fetch('/api/profiles/avatar', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[AvatarUploader] upload avatar failed', json);
        const msg =
          json?.error ||
          json?.details ||
          'Errore durante il caricamento dello storage.';
        throw new Error(msg);
      }

      const publicUrl = json?.avatar_url as string | null;
      if (!publicUrl) throw new Error('URL avatar non disponibile.');

      onChange(publicUrl);
      resetEditor();
    } catch (err: any) {
      console.error('[AvatarUploader] error', err);
      setError(
        typeof err?.message === 'string' && err.message
          ? err.message
          : 'Errore durante il caricamento.'
      );
    } finally {
      setUploading(false);
    }
  }

  function onZoomChange(value: number) {
    const next = clamp(value, 1, MAX_ZOOM);
    setEditorCrop((prev) => ({ ...prev, zoom: next }));
  }

  function onOffsetXChange(value: number) {
    setEditorCrop((prev) => ({ ...prev, offsetX: clamp(value, -1, 1) }));
  }

  function onOffsetYChange(value: number) {
    setEditorCrop((prev) => ({ ...prev, offsetY: clamp(value, -1, 1) }));
  }

  function handlePreviewPointerDown(
    e: PointerEvent<HTMLDivElement>
  ) {
    if (uploading) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: editorCrop.offsetX,
      startOffsetY: editorCrop.offsetY,
      width: rect.width,
      height: rect.height,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePreviewPointerMove(
    e: PointerEvent<HTMLDivElement>
  ) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || uploading) return;

    const rect = previewRef.current?.getBoundingClientRect();
    const width = rect?.width ?? drag.width;
    const height = rect?.height ?? drag.height;
    if (!width || !height) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    const deltaX = (dx / width) * 2;
    const deltaY = (dy / height) * 2;

    setEditorCrop((prev) => ({
      ...prev,
      offsetX: clamp(drag.startOffsetX + deltaX, -1, 1),
      offsetY: clamp(drag.startOffsetY + deltaY, -1, 1),
    }));
  }

  function releasePointer(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <>
      <div className="flex items-start gap-4">
        {/* Preview 4:5 coerente con la mini-card */}
        <div className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-gray-50">
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
              disabled={uploading || editorOpen}
            />
            {uploading ? 'Caricamento...' : 'Carica nuova immagine'}
          </label>
          <div>
            Immagine verticale 4:5 consigliata. Max 10MB.
            Formati supportati: JPG/PNG.
          </div>
          {error && !editorOpen && (
            <div className="text-[11px] text-red-600">{error}</div>
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Regola la foto profilo</h2>
              <p className="text-sm text-gray-500">
                Trascina l’immagine oppure usa gli slider per centrarla e ridimensionarla.
              </p>
            </div>

            <div
              ref={previewRef}
              className="relative mx-auto h-[250px] w-[200px] overflow-hidden rounded-2xl border bg-gray-100"
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
              onPointerLeave={releasePointer}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Anteprima avatar"
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                  Anteprima non disponibile
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-gray-600">
                  Salvataggio…
                </div>
              )}
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Zoom
                <input
                  type="range"
                  min="1"
                  max={MAX_ZOOM}
                  step="0.01"
                  value={editorCrop.zoom}
                  onChange={(event) => onZoomChange(Number(event.target.value))}
                  className="mt-2 w-full"
                  disabled={uploading}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Posizione orizzontale
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.02"
                    value={editorCrop.offsetX}
                    onChange={(event) => onOffsetXChange(Number(event.target.value))}
                    className="mt-2 w-full"
                    disabled={uploading}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Posizione verticale
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.02"
                    value={editorCrop.offsetY}
                    onChange={(event) => onOffsetYChange(Number(event.target.value))}
                    className="mt-2 w-full"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={resetEditor}
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-70"
                onClick={saveAvatar}
                disabled={uploading}
              >
                {uploading ? 'Salvataggio…' : 'Salva ritaglio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
