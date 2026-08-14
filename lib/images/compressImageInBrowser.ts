const MAX_EDGE = 1920;
const TARGET_BYTES = 1_500_000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Il browser non è riuscito a elaborare la foto'))),
      'image/webp',
      quality,
    );
  });
}

/** Compresses before upload, avoiding native server modules and large transfers. */
export async function compressImageInBrowser(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Elaborazione foto non supportata dal browser');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    for (const quality of [0.78, 0.68, 0.58, 0.48]) {
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!blob || blob.size > TARGET_BYTES) {
      throw new Error('La foto è troppo complessa da comprimere sotto 1,5 MB');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const browserImageLimits = { maxEdge: MAX_EDGE, targetBytes: TARGET_BYTES };
