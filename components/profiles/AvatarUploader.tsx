'use client';

import { useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

const TARGET_SIZE = 512; // quadrato, visualizzato come cerchio via CSS
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3;
const INITIAL_ZOOM = (MIN_ZOOM + MAX_ZOOM) / 2;

type CropState = {
  zoom: number;
  crop: { x: number; y: number };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeCropParams(
  image: HTMLImageElement,
  pixels: Area | null,
  { zoom }: CropState
) {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;

  if (!srcW || !srcH) {
    throw new Error('Dimensioni immagine non valide');
  }

  if (pixels) {
    return {
      cropSize: Math.min(pixels.width, pixels.height),
      originX: pixels.x,
      originY: pixels.y,
    };
  }

  const base = Math.min(srcW, srcH); // area quadrata di partenza
  const effectiveZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const cropSize = base / effectiveZoom;

  const originX = Math.max(0, (srcW - cropSize) / 2);
  const originY = Math.max(0, (srcH - cropSize) / 2);

  return { cropSize, originX, originY };
}

async function createAvatarBlob(
  image: HTMLImageElement,
  pixels: Area | null,
  crop: CropState
): Promise<Blob> {
  const { cropSize, originX, originY } = computeCropParams(image, pixels, crop);
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossibile inizializzare il canvas');
  }

  ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  ctx.drawImage(
    image,
    originX,
    originY,
    cropSize,
    cropSize,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Impossibile generare il blob'));
    }, 'image/png');
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
    zoom: INITIAL_ZOOM,
    crop: { x: 0, y: 0 },
  });
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);

  function resetEditor() {
    setEditorOpen(false);
    setImageSrc(null);
    setEditorCrop({ zoom: INITIAL_ZOOM, crop: { x: 0, y: 0 } });
    setCroppedAreaPixels(null);
    imageRef.current = null;
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
      const initialCrop: CropState = { zoom: INITIAL_ZOOM, crop: { x: 0, y: 0 } };
      setEditorCrop(initialCrop);
      setImageSrc(dataUrl);
      setCroppedAreaPixels(null);

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

      const avatarBlob = await createAvatarBlob(image, croppedAreaPixels, editorCrop);
      const form = new FormData();
      form.append('file', avatarBlob, 'avatar.png');

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
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    setEditorCrop((prev) => ({ ...prev, zoom: next }));
  }

  return (
    <>
      <div className="flex items-start gap-4">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border bg-transparent">
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
            Immagine consigliata: quadrata, ritaglio circolare. Max 10MB.
            Formati supportati: JPG/PNG.
          </div>
          {error && !editorOpen && (
            <div className="text-[11px] text-red-600">{error}</div>
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10">
          <div className="w-full max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Regola la foto profilo</h2>
              <p className="text-sm text-gray-500">
                Trascina l’immagine all’interno del cerchio e usa lo slider di zoom per centrarla.
              </p>
            </div>

            <div className="relative mx-auto h-72 w-72 overflow-hidden rounded-full border-4 border-white bg-transparent shadow-inner">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={editorCrop.crop}
                  zoom={editorCrop.zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={(next) => setEditorCrop((prev) => ({ ...prev, crop: next }))}
                  onZoomChange={onZoomChange}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  restrictPosition={false}
                  objectFit="contain"
                  classes={{ containerClassName: 'bg-transparent touch-none', cropAreaClassName: 'backdrop-blur-[0px]' }}
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
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" aria-hidden />
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Zoom
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step="0.01"
                  value={editorCrop.zoom}
                  onChange={(event) => onZoomChange(Number(event.target.value))}
                  className="mt-2 w-full"
                  disabled={uploading}
                />
              </label>
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
