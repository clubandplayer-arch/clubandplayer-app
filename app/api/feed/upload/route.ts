// app/api/feed/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: 'storage_admin_unavailable' },
      { status: 500 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: 'invalid_form' }, { status: 400 });

  const file = form.get('file');
  const kindRaw = form.get('kind');
  const kind = kindRaw === 'video' ? 'video' : 'image';

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_') || `${Date.now()}`;
  const path = `feed/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: uploadError.message || 'upload_failed' },
      { status: 400 }
    );
  }

  const { data: publicData } = admin.storage.from('avatars').getPublicUrl(path);
  const url = publicData?.publicUrl || null;
  if (!url) return NextResponse.json({ ok: false, error: 'public_url_unavailable' }, { status: 400 });

  return NextResponse.json({ ok: true, url, kind }, { status: 201 });
}
