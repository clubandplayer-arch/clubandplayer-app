import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  dbError,
  notAuthorized,
  notFoundError,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { reportApiError } from '@/lib/monitoring/reportApiError';
import { PatchPostSchema } from '@/lib/validation/feed';

export const runtime = 'nodejs';

type PostMediaType = 'image' | 'video';
type PostMediaItem = {
  id: string | null;
  url: string;
  media_type: PostMediaType;
  mediaType: PostMediaType;
  poster_url: string | null;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  position: number;
};

function normalizePostMediaRow(row: any): PostMediaItem | null {
  if (!row || typeof row !== 'object') return null;
  const mediaType = typeof row.media_type === 'string' ? row.media_type.trim().toLowerCase() : '';
  if (mediaType !== 'image' && mediaType !== 'video') return null;
  const url = typeof row.url === 'string' ? row.url.trim() : '';
  if (!url) return null;
  return {
    id: row.id ?? null,
    url,
    media_type: mediaType,
    mediaType: mediaType,
    poster_url: typeof row.poster_url === 'string' ? row.poster_url : null,
    posterUrl: typeof row.poster_url === 'string' ? row.poster_url : null,
    width: Number.isFinite(row.width) ? Number(row.width) : null,
    height: Number.isFinite(row.height) ? Number(row.height) : null,
    position: Number.isFinite(row.position) ? Number(row.position) : 0,
  };
}

function buildFallbackMedia(row: any): PostMediaItem[] {
  const url = typeof row?.media_url === 'string' ? row.media_url.trim() : '';
  const mediaType = typeof row?.media_type === 'string' ? row.media_type.trim().toLowerCase() : '';
  if (!url || (mediaType !== 'image' && mediaType !== 'video')) return [];
  return [
    {
      id: null,
      url,
      media_type: mediaType,
      mediaType: mediaType,
      poster_url: null,
      posterUrl: null,
      width: null,
      height: null,
      position: 0,
    },
  ];
}

function isMissingPostMediaTable(err: any) {
  const msg = err?.message || '';
  return /post_media/i.test(msg) && /does not exist|relation/i.test(msg);
}

async function fetchPostMedia(supabase: any, postId: string) {
  const { data, error } = await supabase
    .from('post_media')
    .select('id, post_id, media_type, url, poster_url, width, height, position')
    .eq('post_id', postId)
    .order('position', { ascending: true });
  if (error) {
    if (isMissingPostMediaTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row: any) => normalizePostMediaRow(row)).filter(Boolean) as PostMediaItem[];
}

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
    media: row.media ?? [],
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
  let media: PostMediaItem[] = [];
  try {
    media = await fetchPostMedia(supabase, id);
  } catch (mediaError: any) {
    reportApiError({
      endpoint: '/api/feed/posts/[id]',
      error: mediaError,
      context: { method: 'PATCH', stage: 'select_post_media' },
    });
  }
  if (!media.length) {
    media = buildFallbackMedia(updated);
  }
  return successResponse({ item: normalizeRow({ ...updated, media }) });
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
