import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { ensureBucket, getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BUCKET = process.env.NEXT_PUBLIC_CLUB_LOGOS_BUCKET || 'club_logos';
const MAX_BYTES = 2 * 1024 * 1024;

function sanitizeFileName(name?: string | null) {
  const base = (name || 'logo').toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
  return base.replace(/^-+|-+$/g, '') || 'logo';
}

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const form = await req.formData();
  const fileEntry = form.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return jsonError('file_missing', 400);
  }

  const file = fileEntry as File;
  if (file.size > MAX_BYTES) {
    return jsonError('file_too_large', 400, { limitBytes: MAX_BYTES });
  }
  const mime = file.type || '';
  if (!/^image\/(png|jpe?g)$/.test(mime)) {
    return jsonError('unsupported_format', 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = getSupabaseAdminClientOrNull();

  let objectPath = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

  async function uploadOnce() {
    return supabase.storage.from(BUCKET).upload(objectPath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: mime || undefined,
    });
  }

  let { error: uploadError } = await uploadOnce();

  if (uploadError && /The resource already exists/i.test(uploadError.message || '')) {
    objectPath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(file.name)}`;
    ({ error: uploadError } = await uploadOnce());
  }

  if (uploadError && /bucket(.+)?not(.+)?found/i.test(uploadError.message || '')) {
    if (admin) {
      await ensureBucket(BUCKET, true).catch(() => null);
      ({ error: uploadError } = await uploadOnce());
    }
  }

  if (uploadError) {
    return jsonError(uploadError.message || 'upload_failed', 400);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) return jsonError('public_url_unavailable', 400);

  return NextResponse.json({ url: publicUrl });
});
