import { type NextRequest } from 'next/server';
import {
  dbError,
  goneResponse,
  invalidPayload,
  notAuthenticated,
  notFoundResponse,
  rlsDenied,
  successResponse,
} from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';

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

type RouteParams = {
  params: Promise<{
    token?: string;
  }>;
};

async function revokeShareLink(req: NextRequest, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken?.trim();
  if (!token) {
    return invalidPayload('Token non valido');
  }

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const { data: existing, error: selectError } = await supabase
    .from('share_links')
    .select('id, token, created_by, revoked_at, expires_at, resource_type, resource_id')
    .eq('token', token)
    .maybeSingle();

  if (selectError) {
    return dbError('Errore nel caricamento del link', { message: selectError.message });
  }

  if (!existing) {
    return notFoundResponse('Link non trovato');
  }

  if (existing.revoked_at) {
    return successResponse({
      shareLink: {
        token: existing.token,
        resourceType: existing.resource_type,
        resourceId: existing.resource_id,
        revokedAt: existing.revoked_at,
        expiresAt: existing.expires_at,
      },
      alreadyRevoked: true,
    });
  }

  const { data, error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('token, resource_type, resource_id, revoked_at, expires_at')
    .maybeSingle();

  if (error) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501') {
      return rlsDenied('Permessi insufficienti per revocare il link');
    }
    return dbError('Errore nella revoca del link', { message: error.message });
  }

  if (!data) {
    return dbError('Errore nella revoca del link');
  }

  return successResponse({
    shareLink: {
      token: data.token,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      revokedAt: data.revoked_at,
      expiresAt: data.expires_at,
    },
  });
}

const PROFILE_FIELDS = 'id, user_id, full_name, display_name, avatar_url, account_type, type';
const DEFAULT_POSTS_BUCKET = process.env.NEXT_PUBLIC_POSTS_BUCKET || 'posts';

function isTokenValid(token: string) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}

async function loadProfile(admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>, authorId: string) {
  const [{ data: byUser }, { data: byProfile }] = await Promise.all([
    admin.from('profiles').select(PROFILE_FIELDS).eq('user_id', authorId).maybeSingle(),
    admin.from('profiles').select(PROFILE_FIELDS).eq('id', authorId).maybeSingle(),
  ]);
  return byUser ?? byProfile ?? null;
}

async function loadPost(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>,
  postId: string,
) {
  const { data, error } = await admin.from('posts').select('*').eq('id', postId).maybeSingle();
  return { data, error };
}

async function signStorageUrl(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>,
  bucket: string,
  path: string,
) {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function normalizeEventPayloadWithPoster(eventPayload: any, posterUrl: string | null) {
  if (!eventPayload || typeof eventPayload !== 'object') return eventPayload ?? null;
  return {
    ...eventPayload,
    poster_url: posterUrl ?? eventPayload.poster_url ?? null,
  };
}

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

async function loadPostMedia(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>,
  postId: string,
) {
  const { data, error } = await admin
    .from('post_media')
    .select('id, post_id, media_type, url, poster_url, width, height, position')
    .eq('post_id', postId)
    .order('position', { ascending: true });
  if (error) {
    if (isMissingPostMediaTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => normalizePostMediaRow(row)).filter(Boolean) as PostMediaItem[];
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken?.trim() ?? '';
  if (!token || !isTokenValid(token)) {
    return invalidPayload('Token non valido');
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return dbError('Service role non configurato');
  }

  const { data: shareLink, error: shareError } = await admin
    .from('share_links')
    .select('token, resource_type, resource_id, revoked_at, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (shareError) {
    return dbError('Errore nel caricamento del link', { message: shareError.message });
  }

  if (!shareLink || shareLink.resource_type !== 'post') {
    return notFoundResponse('Link non valido');
  }

  if (shareLink.revoked_at) {
    return goneResponse('Link scaduto o revocato');
  }

  if (shareLink.expires_at) {
    const expiresAt = new Date(shareLink.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return goneResponse('Link scaduto o revocato');
    }
  }

  const { data: postRow, error: postError } = await loadPost(admin, String(shareLink.resource_id));

  if (postError) {
    return dbError('Errore nel caricamento del post', { message: postError.message });
  }

  if (!postRow) {
    return notFoundResponse('Post non trovato');
  }

  const authorProfile = postRow.author_id ? await loadProfile(admin, String(postRow.author_id)) : null;
  let mediaUrl = postRow.media_url ?? null;

  if (!mediaUrl && postRow.media_path) {
    const signed = await signStorageUrl(
      admin,
      postRow.media_bucket || DEFAULT_POSTS_BUCKET,
      postRow.media_path,
    );
    if (signed) mediaUrl = signed;
  }

  let mediaItems: PostMediaItem[] = [];
  try {
    mediaItems = await loadPostMedia(admin, String(postRow.id));
  } catch (mediaError: any) {
    return dbError('Errore nel caricamento dei media', { message: mediaError?.message });
  }
  if (!mediaItems.length) {
    mediaItems = buildFallbackMedia({ ...postRow, media_url: mediaUrl });
  }

  const rawEventPayload = postRow.event_payload ?? null;
  let eventPayload = rawEventPayload;
  if (rawEventPayload?.poster_path) {
    const posterBucket = rawEventPayload.poster_bucket || DEFAULT_POSTS_BUCKET;
    const posterSigned = await signStorageUrl(admin, posterBucket, rawEventPayload.poster_path);
    eventPayload = normalizeEventPayloadWithPoster(rawEventPayload, posterSigned);
  }

  let quotedPost: FeedPost | null = null;
  if (postRow.quoted_post_id) {
    const { data: quotedRow } = await loadPost(admin, String(postRow.quoted_post_id));
    if (quotedRow) {
      const quotedProfile = quotedRow.author_id ? await loadProfile(admin, String(quotedRow.author_id)) : null;
      const quotedNormalized = normalizePost({
        ...quotedRow,
        author_profile: quotedProfile ?? null,
        author_display_name: quotedProfile?.full_name ?? null,
        author_avatar_url: quotedProfile?.avatar_url ?? null,
      });
      quotedPost = quotedNormalized as FeedPost;
    }
  }

  const linkTitle = (postRow as any).link_title ?? null;
  const linkDescription = (postRow as any).link_description ?? null;
  const linkUrl = (postRow as any).link_url ?? null;

  const post = normalizePost({
    ...postRow,
    media_url: mediaUrl,
    link_title: linkTitle,
    link_description: linkDescription,
    link_url: linkUrl,
    event_payload: eventPayload,
    quoted_post: quotedPost,
    author_profile: authorProfile ?? null,
    author_display_name: authorProfile?.full_name ?? null,
    author_avatar_url: authorProfile?.avatar_url ?? null,
    media: mediaItems,
  }) as FeedPost;

  return successResponse({ post });
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  return revokeShareLink(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteParams) {
  return revokeShareLink(req, ctx);
}
