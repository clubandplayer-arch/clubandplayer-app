import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getSupabaseAdminClient, ensureBucket } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BUCKET = process.env.NEXT_PUBLIC_AVATARS_BUCKET || 'avatars';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const form = await req.formData();
  const fileEntry = form.get('file');

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return jsonError('file_missing', 400);
  }

  const file = fileEntry as File;

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Bypassiamo le policy RLS con il client service-role: la scrittura su storage
  // deve sempre riuscire, indipendentemente dalle policy lato bucket/tabella.
  const client = getSupabaseAdminClient();

  async function uploadOnce() {
    return client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
  }

  let { error: uploadError } = await uploadOnce();

  if (uploadError && /bucket(.+)?not(.+)?found/i.test(uploadError.message || '')) {
    await ensureBucket(BUCKET, true).catch(() => null);
    ({ error: uploadError } = await uploadOnce());
  }

  if (uploadError) {
    return jsonError(uploadError.message || 'storage_upload_failed', 400);
  }

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || null;
  if (!publicUrl) return jsonError('public_url_unavailable', 400);

  const { error: updErr } = await client
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', user.id);

  if (updErr) return jsonError(updErr.message, 400);

  return NextResponse.json({ avatar_url: publicUrl });
});
