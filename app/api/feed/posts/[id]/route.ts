import type { NextRequest } from 'next/server';
import { badRequest, forbidden, internalError, notFound, ok } from '@/lib/api/responses';
import { withAuth } from '@/lib/api/auth';
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
    quoted_post_id: row.quoted_post_id ?? null,
  };
}

const SELECT_BASE = 'id, author_id, content, created_at, media_url, media_type, quoted_post_id';

export const PATCH = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return badRequest('Missing id');

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.content === 'string' ? body.content.trim() : '';

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'PATCH', stage: 'select' } });
  }
  if (fetchErr || !existing) return notFound('Not found');
  if (existing.author_id !== user.id) return forbidden('Forbidden');

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
  if (updateError || !updated) return badRequest(updateError?.message || 'Update failed');
  return ok({ item: normalizeRow(updated) });
});

export const DELETE = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return badRequest('Missing id');

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'DELETE', stage: 'select' } });
  }
  if (fetchErr || !existing) return notFound('Not found');
  if (existing.author_id !== user.id) return forbidden('Forbidden');

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('author_id', user.id);
  if (error) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error, context: { method: 'DELETE', stage: 'delete' } });
    return internalError(error, error.message);
  }
  return ok({});
});
