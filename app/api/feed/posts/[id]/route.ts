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
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { buildProfileDisplayName } from '@/lib/displayName';
import { maskContactInfo } from '@/lib/privacy/maskContactInfo';

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

function normalizeProfileRow(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id ?? null,
    user_id: raw.user_id ?? null,
    full_name: raw.full_name ?? null,
    display_name: raw.display_name ?? raw.name ?? null,
    avatar_url: raw.avatar_url ?? null,
    account_type: raw.account_type ?? raw.type ?? null,
    type: raw.type ?? raw.account_type ?? null,
    is_admin: raw.is_admin ?? null,
    status: raw.status ?? null,
    profile_visibility_status: raw.profile_visibility_status ?? null,
  };
}

function isPublishedAuthor(profile: ReturnType<typeof normalizeProfileRow>) {
  if (!profile?.id) return false;
  const accountType = String(profile.account_type ?? profile.type ?? '').toLowerCase();
  if (accountType === 'admin' || profile.is_admin === true) return true;
  return profile.status === 'active' && profile.profile_visibility_status === 'published';
}

async function fetchAuthorProfile(client: any, authorId?: string | null) {
  if (!authorId) return null;

  const [{ data: byUserId }, { data: byProfileId }] = await Promise.all([
    client.from('profiles').select('id, user_id, full_name, display_name, avatar_url, account_type, type, is_admin, status, profile_visibility_status').eq('user_id', authorId).maybeSingle(),
    client.from('profiles').select('id, user_id, full_name, display_name, avatar_url, account_type, type, is_admin, status, profile_visibility_status').eq('id', authorId).maybeSingle(),
  ]);

  return normalizeProfileRow(byUserId ?? byProfileId ?? null);
}

function normalizeRow(row: any) {
  const authorProfile = normalizeProfileRow(row.author_profile ?? row.author ?? null);
  const fallbackAuthorDisplayName = row.author_display_name ?? row.author_full_name ?? row.author_name ?? row.author ?? null;
  const authorDisplayName = authorProfile
    ? buildProfileDisplayName(
        authorProfile.full_name ?? undefined,
        authorProfile.display_name ?? undefined,
        fallbackAuthorDisplayName ?? 'Profilo',
      )
    : fallbackAuthorDisplayName;

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
    media_aspect: row.media_aspect ?? null,
    kind: row.kind ?? 'normal',
    event_payload: row.event_payload ?? null,
    link_url: row.link_url ?? null,
    link_title: row.link_title ?? null,
    link_description: row.link_description ?? null,
    link_image: row.link_image ?? null,
    quoted_post_id: row.quoted_post_id ?? null,
    media: row.media ?? [],
    author_display_name: authorDisplayName,
    author_avatar_url: authorProfile?.avatar_url ?? row.author_avatar_url ?? null,
    author_profile_id: authorProfile?.id ?? null,
    author_user_id: authorProfile?.user_id ?? null,
    author_account_type: authorProfile?.account_type ?? authorProfile?.type ?? null,
    author_profile: authorProfile,
  };
}

const SELECT_FULL =
  'id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload, link_url, link_title, link_description, link_image, quoted_post_id';
const SELECT_BASE = 'id, author_id, content, created_at, media_url, media_type, quoted_post_id';

async function fetchPostWithFallback(client: any, id: string) {
  const full = await client.from('posts').select(SELECT_FULL).eq('id', id).maybeSingle();
  if (!full.error) return full;
  if (!/column .* does not exist/i.test(full.error.message || '')) return full;
  return client.from('posts').select(SELECT_BASE).eq('id', id).maybeSingle();
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return validationError('Id mancante');

  const readClient = getSupabaseAdminClientOrNull() ?? supabase;
  const { data, error } = await fetchPostWithFallback(readClient, id);

  if (error) {
    reportApiError({ endpoint: '/api/feed/posts/[id]', error, context: { method: 'GET', stage: 'select' } });
    return unknownError({ endpoint: '/api/feed/posts/[id]', error, context: { method: 'GET', stage: 'select' } });
  }
  if (!data) return notFoundError('Post non trovato');

  let media: PostMediaItem[] = [];
  try {
    media = await fetchPostMedia(readClient, id);
  } catch (mediaError: any) {
    reportApiError({
      endpoint: '/api/feed/posts/[id]',
      error: mediaError,
      context: { method: 'GET', stage: 'select_post_media' },
    });
  }
  if (!media.length) {
    media = buildFallbackMedia(data);
  }

  const authorProfile = await fetchAuthorProfile(readClient, data?.author_id);
  const isOwner = data?.author_id === user.id || data?.author_id === authorProfile?.id;
  if (!isOwner && !isPublishedAuthor(authorProfile)) {
    return notFoundError('Post non trovato');
  }

  return successResponse({ item: normalizeRow({ ...data, media, author_profile: authorProfile }) });
});

export const PATCH = withAuth(async (req: NextRequest, { user, supabase }) => {
  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return validationError('Id mancante');

  const parsedBody = PatchPostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return validationError('Payload non valido', parsedBody.error.flatten());
  }
  const payload = parsedBody.data;
  const text = maskContactInfo((payload.content ?? payload.text ?? '').trim());

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
