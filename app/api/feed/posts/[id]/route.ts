import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

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

const SELECT_FULL = 'id, author_id, content, created_at, media_url, media_type';
const SELECT_BASE = 'id, author_id, content, created_at';

export const PATCH = withAuth(async (req: NextRequest, { user }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!text) return jsonError('Content is required', 400);

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (err: any) {
    return jsonError(err?.message || 'Service role missing', 500);
  }

  const { data: existing, error: fetchErr } = await admin
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const runUpdate = async (select: string) =>
    admin
      .from('posts')
      .update({ content: text })
      .eq('id', id)
      .select(select)
      .maybeSingle();

  let updated: any = null;
  let updateError: any = null;

  ({ data: updated, error: updateError } = await runUpdate(SELECT_FULL));

  if (updateError && /column .* does not exist/i.test(updateError.message || '')) {
    ({ data: updated, error: updateError } = await runUpdate(SELECT_BASE));
  }

  if (updateError || !updated) return jsonError(updateError?.message || 'Update failed', 400);
  return NextResponse.json({ ok: true, item: normalizeRow(updated) });
});

export const DELETE = withAuth(async (req: NextRequest, { user }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (err: any) {
    return jsonError(err?.message || 'Service role missing', 500);
  }

  const { data: existing } = await admin
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const { error } = await admin.from('posts').delete().eq('id', id);
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true });
});
