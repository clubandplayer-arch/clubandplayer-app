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

type SessionClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>;

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'missing_file', message: 'Nessun file fornito' }, { status: 400 });
    }

    const hint = typeof form.get('kind') === 'string' ? (form.get('kind') as string) : null;
    const mediaKind = inferKind(file.type || '', hint);
    if (!mediaKind) {
      return NextResponse.json(
        {
          ok: false,
          error: 'unsupported_format',
          message: 'Formato non supportato. Usa JPEG/PNG/WebP oppure MP4.',
        },
        { status: 400 }
      );
    }

    const maxBytes = mediaKind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          ok: false,
          error: 'file_too_large',
          message: `Dimensione massima ${humanSize(maxBytes)} per ${mediaKind === 'image' ? 'le immagini' : 'i video'}.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let objectPath = `${auth.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const uploadOpts = { cacheControl: '3600', upsert: false, contentType: file.type || undefined } as const;

    const uploadWithClient = async (client: SessionClient | AdminClient) =>
      client.storage.from(BUCKET).upload(objectPath, buffer, uploadOpts);

    let uploadError: any = null;
    let uploadData: any = null;

    ({ data: uploadData, error: uploadError } = await uploadWithClient(supabase));

    if (uploadError && /The resource already exists/i.test(uploadError.message || '')) {
      objectPath = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(file.name)}`;
      ({ data: uploadData, error: uploadError } = await uploadWithClient(supabase));
    }

    if (uploadError) {
      const admin = getSupabaseAdminClientOrNull();
      if (!admin) {
        reportApiError({ endpoint: '/api/feed/upload', error: uploadError, context: { stage: 'upload_session' } });
        return NextResponse.json(
          {
            ok: false,
            error: 'upload_failed',
            message: uploadError.message || 'Upload fallito: bucket non disponibile.',
          },
          { status: 400 }
        );
      }

      await ensureBucket(BUCKET, true);
      ({ data: uploadData, error: uploadError } = await uploadWithClient(admin));
    }

    if (uploadError || !uploadData) {
      reportApiError({ endpoint: '/api/feed/upload', error: uploadError, context: { stage: 'upload_final' } });
      return NextResponse.json(
        {
          ok: false,
          error: 'upload_failed',
          message: uploadError?.message || 'Upload non riuscito',
        },
        { status: 400 }
      );
    }

    const { data: publicInfo } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = publicInfo?.publicUrl;

    return NextResponse.json({ ok: true, url: publicUrl, path: objectPath, mediaType: mediaKind });
  } catch (error: any) {
    reportApiError({ endpoint: '/api/feed/upload', error, context: { method: 'POST' } });
    return NextResponse.json({ ok: false, error: 'upload_failed', message: error?.message }, { status: 400 });
  }
}
