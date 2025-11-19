import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ensureBucket, getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { reportApiError } from '@/lib/monitoring/reportApiError';

export const runtime = 'nodejs';

const BUCKET = 'posts';
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB

function inferKind(mime: string, hint?: string | null): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_TYPES.has(mime)) return 'image';
  if (ALLOWED_VIDEO_TYPES.has(mime)) return 'video';
  if (hint === 'image' || hint === 'video') return hint;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

function sanitizeFileName(name?: string | null) {
  const base = (name || 'media').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
  return base.replace(/^-+|-+$/g, '') || 'media';
}

function humanSize(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function makeError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: code, code, message }, { status });
}

function isRlsError(err: any) {
  if (!err) return false;
  const joined = [err.message, err.details, err.hint]
    .filter(Boolean)
    .map((v) => v.toString().toLowerCase())
    .join(' ');
  return (
    err.code === '42501' ||
    err.code === 'PGRST302' ||
    joined.includes('row-level security') ||
    joined.includes('permission denied') ||
    joined.includes('new row violates')
  );
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClientOrNull();
  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return makeError('not_authenticated', 'Effettua il login per caricare media.', 401);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return makeError('missing_file', 'Nessun file fornito');
    }

    const hintRaw = typeof form.get('kind') === 'string' ? (form.get('kind') as string) : null;
    const hint = hintRaw ? hintRaw.toLowerCase().trim() : null;
    const mediaKind = inferKind(file.type || '', hint);
    if (!mediaKind) {
      return makeError('unsupported_format', 'Formato non supportato. Usa JPEG/PNG/WebP oppure MP4.');
    }

    const maxBytes = mediaKind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      const scope = mediaKind === 'image' ? 'le immagini' : 'i video';
      return makeError('file_too_large', `Dimensione massima ${humanSize(maxBytes)} per ${scope}.`);
    }

    const allowedTypes = mediaKind === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    if (file.type && !allowedTypes.has(file.type)) {
      const code = mediaKind === 'image' ? 'unsupported_image' : 'unsupported_video';
      const message =
        mediaKind === 'image'
          ? 'Formato immagine non supportato. Usa JPEG/PNG/WebP/GIF.'
          : 'Formato video non supportato. Usa un file MP4.';
      return makeError(code, message);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let objectPath = `${auth.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const uploadOpts = { cacheControl: '3600', upsert: false, contentType: file.type || undefined } as const;

    const sessionBucket = supabase.storage.from(BUCKET);
    const adminBucket = admin ? admin.storage.from(BUCKET) : null;

    async function uploadWithSession() {
      return sessionBucket.upload(objectPath, buffer, uploadOpts);
    }

    async function uploadWithAdmin() {
      if (!adminBucket) throw new Error('missing_admin_client');
      return adminBucket.upload(objectPath, buffer, uploadOpts);
    }

    let { data: uploadData, error: uploadError } = await uploadWithSession();

    if (uploadError && /The resource already exists/i.test(uploadError.message || '')) {
      objectPath = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(file.name)}`;
      ({ data: uploadData, error: uploadError } = await uploadWithSession());
    }

    if (uploadError && /bucket(.+)?not(.+)?found/i.test(uploadError.message || '')) {
      if (admin) {
        await ensureBucket(BUCKET, true).catch(() => null);
        ({ data: uploadData, error: uploadError } = await uploadWithSession());
      }
    }

    if (uploadError && isRlsError(uploadError)) {
      if (!adminBucket) {
        return makeError(
          'rls_blocked',
          'Permessi insufficienti per scrivere nel bucket posts. Configura la service role o aggiorna le policy.',
          403
        );
      }
      ({ data: uploadData, error: uploadError } = await uploadWithAdmin());
    }

    if (uploadError || !uploadData) {
      console.error('[feed/upload] storage_error', {
        bucket: BUCKET,
        kind: mediaKind,
        fileType: file.type,
        fileSize: file.size,
        hint,
        error: uploadError,
      });
      reportApiError({
        endpoint: '/api/feed/upload',
        error: uploadError,
        context: { stage: 'upload_session', kind: mediaKind, mime: file.type, size: file.size },
      });
      return makeError(
        'storage_error',
        uploadError?.message ? `Supabase storage error: ${uploadError.message}` : 'Upload non riuscito'
      );
    }

    const { data: publicInfo } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = publicInfo?.publicUrl;
    if (!publicUrl) {
      return makeError('public_url_unavailable', "Impossibile generare l'URL pubblico.");
    }

    return NextResponse.json({ ok: true, url: publicUrl, path: objectPath, mediaType: mediaKind });
  } catch (error: any) {
    console.error('[feed/upload] unexpected_error', error);
    reportApiError({
      endpoint: '/api/feed/upload',
      error,
      context: { method: 'POST' },
    });
    return makeError('upload_failed', error?.message || 'Upload non riuscito');
  }
}
