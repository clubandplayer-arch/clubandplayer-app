// app/api/feed/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const bucket = process.env.NEXT_PUBLIC_POSTS_BUCKET || 'posts';
  const supabase = await getSupabaseServerClient().catch(() => null);

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'storage_unavailable', message: 'Storage non disponibile' }, { status: 500 });
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated', message: 'Devi essere autenticato' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: 'invalid_form', message: 'Form non valida' }, { status: 400 });
  }

  const rawFile = form.get('file');
  const kindRaw = form.get('kind');
  const kind = kindRaw === 'video' ? 'video' : 'image';

  if (!(rawFile instanceof Blob)) {
    return NextResponse.json({ ok: false, error: 'file_required', message: 'File mancante' }, { status: 400 });
  }

  const file = rawFile as File;

  const isVideo = kind === 'video' || file.type.startsWith('video');
  const isImage = !isVideo && (kind === 'image' || file.type.startsWith('image'));

  if (!isVideo && !isImage) {
    return NextResponse.json(
      { ok: false, error: 'unsupported_type', message: 'Formato non supportato. Usa immagine o video (es. mp4).' },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_') || `${Date.now()}`;
  const path = `${authData.user.id}/${Date.now()}-${safeName}`;
  const storage = supabase.storage;

  async function uploadOnce() {
    return storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
  }

  const { error: uploadError } = await uploadOnce();

  if (uploadError) {
    const msg = uploadError.message || 'upload_failed';
    const normalized = msg.toLowerCase().includes('row-level security')
      ? 'rls_blocked'
      : msg.toLowerCase().includes('bucket not found')
        ? 'bucket_not_found'
        : 'upload_failed';
    return NextResponse.json({ ok: false, error: normalized, message: msg }, { status: 400 });
  }

  const { data: publicData } = storage.from(bucket).getPublicUrl(path);
  const url = publicData?.publicUrl || null;
  if (!url) {
    return NextResponse.json(
      { ok: false, error: 'public_url_unavailable', message: 'URL pubblico non disponibile' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, url, kind: isVideo ? 'video' : 'image' }, { status: 201 });
}
