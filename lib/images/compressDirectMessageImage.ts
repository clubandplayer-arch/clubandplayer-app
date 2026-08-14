import sharp from 'sharp';

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_EDGE = 1920;
const TARGET_BYTES = 1_500_000;

/** Normalizes chat photos to a small, metadata-free WebP. */
export async function compressDirectMessageImage(input: Buffer) {
  const image = sharp(input, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Immagine non valida');

  const attempts = [
    { edge: MAX_EDGE, quality: 76 },
    { edge: 1600, quality: 68 },
    { edge: 1280, quality: 62 },
  ];

  let output: Buffer | null = null;
  for (const attempt of attempts) {
    output = await image
      .clone()
      .resize({ width: attempt.edge, height: attempt.edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: attempt.quality, effort: 4 })
      .toBuffer();
    if (output.length <= TARGET_BYTES) break;
  }

  if (!output || output.length > TARGET_BYTES) {
    throw new Error('Non è stato possibile ottimizzare la foto sotto 1,5 MB');
  }
  return { buffer: output, contentType: 'image/webp' as const, extension: 'webp' as const };
}

export const directMessageImageLimits = {
  maxInputPixels: MAX_INPUT_PIXELS,
  maxEdge: MAX_EDGE,
  targetBytes: TARGET_BYTES,
};
