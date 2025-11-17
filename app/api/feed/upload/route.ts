// app/api/feed/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdminClientOrNull();
  const userSupabase = await getSupabaseServerClient().catch(() => null);

  if (!userSupabase) {
    return NextResponse.json({ ok: false, error: 'storage_unavailable' }, { status: 500 });
  }

  const { data: authData, error: authErr } = await userSupabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
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
  const path = `posts/${authData.user.id}/${Date.now()}-${safeName}`;
  const storage = (admin ?? userSupabase).storage;

  const { error: uploadError } = await storage
    .from('posts')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: uploadError.message || 'upload_failed' },
      { status: 400 }
    );
  }

  const { data: publicData } = storage.from('posts').getPublicUrl(path);
  const url = publicData?.publicUrl || null;
  if (!url) return NextResponse.json({ ok: false, error: 'public_url_unavailable' }, { status: 400 });

  return NextResponse.json({ ok: true, url, kind }, { status: 201 });
}
