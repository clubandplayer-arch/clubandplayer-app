import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function normalizeRow(row: any) {
  return {
    id: row.id,
    text: row.content ?? '',
    createdAt: row.created_at,
    content: row.content ?? '',
    created_at: row.created_at,
    authorId: row.author_id ?? null,
    author_id: row.author_id ?? null,
    media_url: row.media_url ?? null,
    media_type: row.media_type ?? null,
  };
}

async function getPostOwner(supabase: any, id: string) {
  const { data, error } = await supabase.from('posts').select('id, author_id').eq('id', id).maybeSingle();
  if (error) return { data: null, error };
  return { data, error: null };
}

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!text) return jsonError('Content is required', 400);

  const { data: existing, error: fetchErr } = await getPostOwner(supabase, id);

  if (fetchErr && !existing) {
    const admin = getSupabaseAdminClientOrNull();
    if (admin) {
      const { data: adminRow } = await admin.from('posts').select('id, author_id').eq('id', id).maybeSingle();
      if (!adminRow) return jsonError('Not found', 404);
      if (adminRow.author_id !== user.id) return jsonError('Forbidden', 403);
      const { data: updated, error: adminUpdateErr } = await admin
        .from('posts')
        .update({ content: text })
        .eq('id', id)
        .select('id, author_id, content, created_at, media_url, media_type')
        .maybeSingle();
      if (adminUpdateErr || !updated) return jsonError(adminUpdateErr?.message || 'Update failed', 400);
      return NextResponse.json({ ok: true, item: normalizeRow(updated) });
    }
    return jsonError('Not found', 404);
  }

  if (!existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const runUpdate = async (select: string) =>
    supabase
      .from('posts')
      .update({ content: text })
      .eq('id', id)
      .eq('author_id', user.id)
      .select(select)
      .maybeSingle();

  let updated: any = null;
  let updateError: any = null;

  ({ data: updated, error: updateError } = await runUpdate('id, author_id, content, created_at, media_url, media_type'));

  if (updateError && /column .* does not exist/i.test(updateError.message || '')) {
    ({ data: updated, error: updateError } = await runUpdate('id, author_id, content, created_at'));
  }

  if (updateError || !updated) return jsonError(updateError?.message || 'Update failed', 400);
  return NextResponse.json({ ok: true, item: normalizeRow(updated) });
});

export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const { data: existing, error: fetchErr } = await getPostOwner(supabase, id);

  if (fetchErr && !existing) {
    const admin = getSupabaseAdminClientOrNull();
    if (admin) {
      const { data: adminRow } = await admin.from('posts').select('id, author_id').eq('id', id).maybeSingle();
      if (!adminRow) return jsonError('Not found', 404);
      if (adminRow.author_id !== user.id) return jsonError('Forbidden', 403);
      const { error: adminErr } = await admin.from('posts').delete().eq('id', id);
      if (adminErr) return jsonError(adminErr.message, 400);
      return NextResponse.json({ ok: true });
    }
    return jsonError('Not found', 404);
  }

  if (!existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('author_id', user.id);
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
