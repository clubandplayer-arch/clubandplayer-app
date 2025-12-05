import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  dbError,
  notAuthorized,
  notFoundError,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { reportApiError } from '@/lib/monitoring/reportApiError';
import { PatchPostSchema } from '@/lib/validation/feed';

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
  if (!id) return validationError('Id mancante');

  const parsedBody = PatchPostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return validationError('Payload non valido', parsedBody.error.flatten());
  }
  const payload = parsedBody.data;
  const text = (payload.content ?? payload.text ?? '').trim();

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'PATCH', stage: 'select' } });
    return unknownError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'PATCH', stage: 'select' } });
  }
  if (!existing) return notFoundError('Post non trovato');
  if (existing.author_id !== user.id) return notAuthorized('Operazione non consentita');

  const { data: updated, error: updateError } = await supabase
    .from('posts')
    .update({ content: text })
    .eq('id', id)
    .eq('author_id', user.id)
    .select(SELECT_BASE)
    .maybeSingle();

  if (updateError) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: updateError, context: { method: 'PATCH', stage: 'update' } });
    return dbError('Aggiornamento post non riuscito', { message: updateError?.message });
  }
  if (!updated) return notFoundError('Post non trovato');
  return successResponse({ item: normalizeRow(updated) });
});

export const DELETE = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return validationError('Id mancante');

  const { data: existing, error: fetchErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'DELETE', stage: 'select' } });
    return unknownError({ endpoint: '/api/feed/posts/[id]', error: fetchErr, context: { method: 'DELETE', stage: 'select' } });
  }
  if (!existing) return notFoundError('Post non trovato');
  if (existing.author_id !== user.id) return notAuthorized('Operazione non consentita');

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('author_id', user.id);
  if (error) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error, context: { method: 'DELETE', stage: 'delete' } });
    return dbError('Eliminazione non riuscita', { message: error?.message });
  }
  return successResponse({});
});
