import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { reportApiError } from '@/lib/monitoring/reportApiError';

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

const SELECT_BASE = 'id, author_id, content, created_at';

export const PATCH = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!text) return jsonError('Content is required', 400);

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'PATCH', stage: 'select' } });
  }
  if (fetchErr || !existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const { data: updated, error: updateError } = await supabase
    .from('posts')
    .update({ content: text })
    .eq('id', id)
    .eq('author_id', user.id)
    .select(SELECT_BASE)
    .maybeSingle();

  if (updateError) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: updateError, context: { method: 'PATCH', stage: 'update' } });
  }
  if (updateError || !updated) return jsonError(updateError?.message || 'Update failed', 400);
  return NextResponse.json({ ok: true, item: normalizeRow(updated) });
});

export const DELETE = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'DELETE', stage: 'select' } });
  }
  if (fetchErr || !existing) return jsonError('Not found', 404);
  if (existing.author_id !== user.id) return jsonError('Forbidden', 403);

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('author_id', user.id);
  if (error) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error, context: { method: 'DELETE', stage: 'delete' } });
    return jsonError(error.message, 400);
  }
  return NextResponse.json({ ok: true });
});
