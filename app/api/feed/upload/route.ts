// app/api/feed/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClientOrNull, ensureBucket } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const bucket = process.env.NEXT_PUBLIC_POSTS_BUCKET || 'posts';
  const admin = getSupabaseAdminClientOrNull();
  const userSupabase = await getSupabaseServerClient().catch(() => null);

  if (!userSupabase) {
    return NextResponse.json({ ok: false, error: 'storage_unavailable' }, { status: 500 });
  }
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const { data: authData, error: authErr } = await userSupabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: 'invalid_form' }, { status: 400 });

  const rawFile = form.get('file');
  const kindRaw = form.get('kind');
  const kind = kindRaw === 'video' ? 'video' : 'image';

  if (!(rawFile instanceof Blob)) {
    return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });
  }

  const file = rawFile as File;

  await ensureBucket(bucket, true).catch(() => null);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_') || `${Date.now()}`;
  const path = `${authData.user.id}/${Date.now()}-${safeName}`;
  const storage = admin.storage;

  async function uploadOnce() {
    return storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
  }

  const { error: uploadError } = await uploadOnce();

  if (uploadError) {
    const msg = uploadError.message || 'upload_failed';
    const normalized = msg.toLowerCase().includes('bucket not found') ? 'bucket_not_found' : msg;
    return NextResponse.json({ ok: false, error: normalized }, { status: 400 });
  }

  const { data: publicData } = storage.from(bucket).getPublicUrl(path);
  const url = publicData?.publicUrl || null;
  if (!url) return NextResponse.json({ ok: false, error: 'public_url_unavailable' }, { status: 400 });

  return NextResponse.json({ ok: true, url, kind }, { status: 201 });
}
