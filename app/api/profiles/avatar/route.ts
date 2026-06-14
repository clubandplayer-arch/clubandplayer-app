import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { ensureBucket, getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

const BUCKET = process.env.NEXT_PUBLIC_AVATARS_BUCKET || 'avatars';
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  try {
    await rateLimit(req, { key: `avatar:POST:${user.id}`, limit: 5, window: '10m' });
  } catch (error: any) {
    return jsonError('Too Many Requests', 429, { retryAfter: error?.headers?.['Retry-After'] ?? null });
  }

  const form = await req.formData();
  const fileEntry = form.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return jsonError('file_missing', 400);
  }

  const file = fileEntry as File;
  const contentType = file.type.toLowerCase();
  const ext = ALLOWED_AVATAR_TYPES.get(contentType);

  if (!ext) {
    return jsonError('avatar_type_not_allowed', 415, {
      allowedTypes: Array.from(ALLOWED_AVATAR_TYPES.keys()),
    });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return jsonError('avatar_too_large', 413, {
      maxBytes: MAX_AVATAR_BYTES,
    });
  }

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = getSupabaseAdminClientOrNull();
  const buffer = Buffer.from(await file.arrayBuffer());

  async function uploadOnce() {
    return supabase.storage.from(BUCKET).upload(path, buffer, {
      cacheControl: '31536000',
      upsert: false,
      contentType,
    });
  }

  let { error: uploadError } = await uploadOnce();

  if (uploadError && /bucket(.+)?not(.+)?found/i.test(uploadError.message || '')) {
    if (admin) {
      await ensureBucket(BUCKET, true).catch(() => null);
      ({ error: uploadError } = await uploadOnce());
    }
  }

  if (uploadError) {
    return jsonError(uploadError.message || 'storage_upload_failed', 400);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || null;
  if (!publicUrl) return jsonError('public_url_unavailable', 400);

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', user.id);

  if (updErr) return jsonError(updErr.message, 400);

  return NextResponse.json({ avatar_url: publicUrl });
});
