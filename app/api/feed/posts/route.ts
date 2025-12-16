// app/api/feed/posts/route.ts
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  dbError,
  notAuthenticated,
  notAuthorized,
  notFoundError,
  rateLimited,
  rlsDenied,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { reportApiError } from '@/lib/monitoring/reportApiError';
import { getActiveProfile } from '@/lib/api/profile';
import { CreatePostSchema, FeedPostsQuerySchema, type CreatePostInput, type FeedPostsQueryInput } from '@/lib/validation/feed';

export const runtime = 'nodejs';

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5_000;
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';

type Role = 'club' | 'athlete';
type PostKind = 'normal' | 'event';
type DbPostKind = 'normal' | 'event';

function normRole(v: unknown): Role | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'club') return 'club';
  if (s === 'athlete') return 'athlete';
  return null;
}

function normKind(raw: unknown): PostKind {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'event') return 'event';
  if (s === 'normal') return 'normal';
  if (s === 'post') return 'normal';
  return 'normal';
}

type EventPayload = {
  title: string;
  date: string;
  description?: string | null;
  location?: string | null;
  poster_url?: string | null;
  poster_path?: string | null;
  poster_bucket?: string | null;
};

function normalizeEventPayload(raw: any): EventPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  if (!title || !date) return null;
  const location = typeof raw.location === 'string' ? raw.location.trim() || null : null;
  const description = typeof raw.description === 'string' ? raw.description.trim() || null : null;
  const posterUrl = typeof raw.poster_url === 'string' ? raw.poster_url.trim() || null : null;
  const posterPath = typeof raw.poster_path === 'string' ? raw.poster_path.trim() || null : null;
  const posterBucket = typeof raw.poster_bucket === 'string' ? raw.poster_bucket.trim() || null : null;
  return {
    title,
    date,
    description,
    location,
    poster_url: posterUrl,
    poster_path: posterPath,
    poster_bucket: posterBucket,
  };
}

function normalizeRow(row: any, quotedMap?: Map<string, any>, depth = 0): any {
  const aspectFromUrl = inferAspectFromUrl(row.media_url);
  const quotedRaw: any = row.quoted_post_id ? quotedMap?.get(row.quoted_post_id) : null;
  const quotedPost = quotedRaw && depth < 1 ? normalizeRow(quotedRaw, quotedMap, depth + 1) : null;
  const authorProfile = (row as any)?.author ?? (row as any)?.profiles ?? null;
  const authorDisplayName =
    (authorProfile?.full_name as string | undefined) ??
    (authorProfile?.display_name as string | undefined) ??
    (authorProfile?.name as string | undefined) ??
    null;
  const authorAvatarUrl = (authorProfile?.avatar_url as string | undefined) ?? null;
  const authorRole = normRole(authorProfile?.account_type ?? authorProfile?.type) ?? null;
  const authorProfileId = (authorProfile?.id as string | undefined) ?? null;

  return {
    id: row.id,
    // legacy
    text: row.content ?? '',
    createdAt: row.created_at,
    // nuovi
    content: row.content ?? '',
    created_at: row.created_at,
    authorId: row.author_id ?? null,
    author_id: row.author_id ?? null,
    media_url: row.media_url ?? null,
    media_type: row.media_type ?? null,
    media_aspect: normalizeAspect(row.media_aspect) ?? aspectFromUrl ?? null,
    link_url: row.link_url ?? null,
    link_title: row.link_title ?? null,
    link_description: row.link_description ?? null,
    link_image: row.link_image ?? null,
    kind: row.kind ? normKind(row.kind) : 'normal',
    event_payload: normalizeEventPayload(row.event_payload) ?? null,
    role: undefined as unknown as 'club' | 'athlete' | undefined,
    quoted_post_id: row.quoted_post_id ?? null,
    quoted_post: quotedPost,
    author_display_name: authorDisplayName,
    author_avatar_url: authorAvatarUrl,
    author_role: authorRole,
    author_profile_id: authorProfileId,
  };
}

type ProfileClient =
  | Awaited<ReturnType<typeof getSupabaseServerClient>>
  | NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>;

type AuthorProfileMaps = {
  byUserId: Map<string, any> | null;
  byProfileId: Map<string, any> | null;
};

async function buildAuthorProfileMaps(client: ProfileClient, authorIds: string[]): Promise<AuthorProfileMaps> {
  if (!authorIds.length) {
    return { byUserId: null, byProfileId: null };
  }

  const [{ data: profilesByUserId }, { data: profilesByProfileId }] = await Promise.all([
    client.from('profiles').select(PROFILE_FIELDS).in('user_id', authorIds),
    client.from('profiles').select(PROFILE_FIELDS).in('id', authorIds),
  ]);

  const byUserId = profilesByUserId?.length
    ? new Map(profilesByUserId.map((p) => [String((p as any)?.user_id), { ...p, type: (p as any)?.type ?? null }]))
    : null;
  const byProfileId = profilesByProfileId?.length
    ? new Map(profilesByProfileId.map((p) => [String((p as any)?.id), { ...p, type: (p as any)?.type ?? null }]))
    : null;

  return { byUserId, byProfileId };
}

function attachAuthorProfile(row: any, maps: AuthorProfileMaps): any {
  if (!row?.author && !row?.profiles && row?.author_id) {
    const fromUserId = maps.byUserId?.get(row.author_id);
    const fromProfileId = maps.byProfileId?.get(row.author_id);
    if (fromUserId || fromProfileId) {
      return { ...row, author: fromUserId || fromProfileId };
    }
  }
  return row;
}

// GET: lettura autenticata, filtra i post per ruolo dell'autore
export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const parsedQuery = FeedPostsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsedQuery.success) {
    return validationError('Parametri non validi', parsedQuery.error.flatten());
  }

  const { debug, mine, authorId: authorIdFilter, limit, page, scope }: FeedPostsQueryInput = parsedQuery.data;
  const from = page * limit;
  const to = from + limit - 1;
  const supabase = await getSupabaseServerClient();

  const allowedAuthorProfileIds: string[] = [];

  const buildDebug = (extra?: Record<string, any>) =>
    debug && process.env.NODE_ENV !== 'production'
      ? {
          userId: currentUserId,
          activeProfileId: currentProfileId,
          scope,
          followedCount: followedAuthorProfileIds.length,
          followedUserIdsCount: followedAuthorUserIds.length,
          allowedAuthorProfileIdsCount: allowedAuthorProfileIds.length,
          allowedAuthorIdsCount: allowedAuthors?.length ?? 0,
          ...extra,
        }
      : null;

  // determina ruolo dell'utente corrente
  let currentUserId: string | null = null;
  let currentProfileId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      currentUserId = data.user.id;
      const activeProfile = await getActiveProfile(supabase, data.user.id);
      currentProfileId = activeProfile?.id ?? null;
    }
  } catch {
    // se qualcosa fallisce, continuiamo senza ruolo
  }

  if (mine && !currentProfileId) {
    return notAuthenticated('Utente non autenticato per filtrare i propri post');
  }

  const followedAuthorProfileIds: string[] = [];
  const followedAuthorUserIds: string[] = [];

  const shouldLoadFollows = Boolean(currentProfileId && (scope === 'following' || (!authorIdFilter && !mine)));

  if (shouldLoadFollows) {
    const followerIds = Array.from(new Set([currentProfileId, currentUserId].filter(Boolean)));

    const { data: followRows, error: followError } = await supabase
      .from('follows')
      .select('target_profile_id')
      .or(followerIds.map((id) => `follower_profile_id.eq.${id}`).join(','))
      .neq('target_profile_id', currentProfileId)
      .limit(500);

    if (!followError && Array.isArray(followRows) && followRows.length) {
      followRows
        .map((row) => {
          const target = (row as any)?.target_profile_id;
          return target ? String(target) : null;
        })
        .filter(Boolean)
        .forEach((pid) => followedAuthorProfileIds.push(pid as string));

      const targetProfiles = Array.from(new Set(followedAuthorProfileIds));
      if (targetProfiles.length) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, user_id')
          .in('id', targetProfiles);
        (profileRows ?? [])
          .map((p) => (p as any)?.user_id)
          .filter(Boolean)
          .forEach((uid) => followedAuthorUserIds.push(String(uid)));
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[feed/posts] follows scope', {
        followerIds,
        profileCount: followedAuthorProfileIds.length,
        userCount: followedAuthorUserIds.length,
      });
    }
  }
  }

  let allowedAuthors: string[] | null = null;

  if (scope === 'following') {
    if (authorIdFilter) {
      allowedAuthors = [authorIdFilter];
    } else if (mine && currentUserId) {
      allowedAuthors = [currentUserId];
    } else {
      if (!currentUserId) {
        const debugPayload = buildDebug({ count: 0 });
        if (debugPayload) console.log('[feed]', debugPayload);
        return successResponse({
          items: [],
          nextPage: null,
          ...(debugPayload ? { _debug: debugPayload } : {}),
        });
      }

      const uniq = Array.from(new Set(followedAuthorUserIds.filter(Boolean)));
      allowedAuthorProfileIds.push(...followedAuthorProfileIds);
      if (!uniq.length && !allowedAuthorProfileIds.length) {
        const debugPayload = buildDebug({ count: 0 });
        if (debugPayload) console.log('[feed]', debugPayload);
        return successResponse({
          items: [],
          nextPage: null,
          ...(debugPayload ? { _debug: debugPayload } : {}),
        });
      }

      const fromProfiles = allowedAuthorProfileIds.filter(Boolean);
      const merged = Array.from(new Set([...uniq, ...fromProfiles]));
      allowedAuthors = merged;
    }
  } else {
    allowedAuthors = (() => {
      if (authorIdFilter) return [authorIdFilter];
      const selfIds = [currentUserId, currentProfileId].filter(Boolean) as string[];
      if (mine && selfIds.length) return selfIds;
      if (!authorIdFilter && !mine && (currentUserId || currentProfileId)) {
        allowedAuthorProfileIds.push(...followedAuthorProfileIds);
        const uniq = Array.from(
          new Set([...selfIds, ...followedAuthorUserIds, ...allowedAuthorProfileIds].filter(Boolean)),
        );
        return uniq.length ? uniq : null;
      }
      return null;
    })();
  }

  const fetchPosts = async (sel: string) => {
    let query = supabase
      .from('posts')
      .select(sel)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (allowedAuthors?.length) {
      query = query.in('author_id', allowedAuthors);
    }

    return query;
  };

  let data: any[] | null = null;
  let error: any = null;

  ({ data, error } = await fetchPosts(SELECT_WITH_LINK));

  if (error && /column .* does not exist/i.test(error.message || '')) {
    ({ data, error } = await fetchPosts(SELECT_WITH_MEDIA));
  }

  if (error && /column .* does not exist/i.test(error.message || '')) {
    ({ data, error } = await fetchPosts(SELECT_BASE));
  }

  if (error) {
    reportApiError({
      endpoint: '/api/feed/posts',
      error,
      context: { stage: 'select', method: 'GET' },
    });
    return dbError('Errore nel recupero dei post', debug ? { message: error.message, details: error.details } : undefined);
  }

  const postsCountBeforeJoin = Array.isArray(data) ? data.length : 0;

  const authorIds = Array.from(
    new Set((Array.isArray(data) ? data : []).map((r) => r?.author_id).filter(Boolean)),
  ) as string[];

  const { byUserId: authorProfileMapByUserId, byProfileId: authorProfileMapByProfileId } =
    await buildAuthorProfileMaps(supabase, authorIds);

  let quotedMap: Map<string, any> | null = null;

  const quotedIds = Array.from(
    new Set(
      (Array.isArray(data) ? data : [])
        .map((r) => r?.quoted_post_id)
        .filter((v) => typeof v === 'string' && v.trim().length > 0),
    ),
  );

  if (quotedIds.length) {
    const { data: quotedRows, error: quotedError } = await supabase
      .from('posts')
      .select(SELECT_QUOTED)
      .in('id', quotedIds);

    if (!quotedError && Array.isArray(quotedRows)) {
      const quotedMaps = await buildAuthorProfileMaps(
        supabase,
        Array.from(new Set(quotedRows.map((r) => r?.author_id).filter(Boolean) as string[])),
      );
      const enrichedQuotedRows = quotedRows.map((row) => attachAuthorProfile(row, quotedMaps));
      quotedMap = new Map(enrichedQuotedRows.map((row) => [row.id, row]));
    }
  }

  const rows =
    (data ?? [])
      .map((r) => attachAuthorProfile(r, { byUserId: authorProfileMapByUserId, byProfileId: authorProfileMapByProfileId }))
      .map((r) => normalizeRow(r, quotedMap ?? undefined)) || [];
  const postsCountAfterJoin = rows.length;

  const debugPayload = buildDebug({
    count: rows.length,
    allowedAuthorIdsCount: allowedAuthors?.length ?? 0,
    postsCountBeforeJoin,
    postsCountAfterJoin,
    scope,
  });

  if (debugPayload) {
    console.log('[feed]', debugPayload);
  }

  if (mine || authorIdFilter) {
    return successResponse({
      items: rows,
      nextPage: rows.length === limit ? page + 1 : null,
      ...(debugPayload ? { _debug: debugPayload } : {}),
    });
  }

  return successResponse({
    items: rows,
    nextPage: rows.length === limit ? page + 1 : null,
    ...(debugPayload ? { _debug: debugPayload } : {}),
  });
}

function isMissingMediaColumns(err: any) {
  const msg = err?.message || '';
  return /column .*media_/i.test(msg);
}

function isMissingLinkColumns(err: any) {
  const msg = err?.message || '';
  return /column .*link_/i.test(msg);
}

function isRlsError(err: any) {
  if (!err) return false;
  const parts = [err.message, err.details, err.hint]
    .filter(Boolean)
    .map((v) => v.toString().toLowerCase());
  const msg = parts.join(' ');
  return (
    err.code === '42501' ||
    err.code === 'PGRST302' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('new row violates')
  );
}

function isKindConstraintError(err: any) {
  if (!err) return false;
  const parts = [err.message, err.details, err.hint]
    .filter(Boolean)
    .map((v) => v.toString().toLowerCase());
  const msg = parts.join(' ');
  return (
    msg.includes('posts_kind_check') ||
    msg.includes('invalid input value') ||
    msg.includes('kind in (') ||
    msg.includes('kind')
  );
}

const PROFILE_FIELDS = 'id, user_id, full_name, display_name, avatar_url, account_type, type';

const SELECT_WITH_MEDIA =
  'id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload, quoted_post_id';
const SELECT_WITH_LINK = `${SELECT_WITH_MEDIA}, link_url, link_title, link_description, link_image`;
const SELECT_BASE = 'id, author_id, content, created_at, kind, event_payload, quoted_post_id';
const SELECT_QUOTED =
  'id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload, link_url, link_title, link_description, link_image, quoted_post_id';
const DEFAULT_POSTS_BUCKET = process.env.NEXT_PUBLIC_POSTS_BUCKET || 'posts';

function sanitizeStoragePath(path: string) {
  return path
    .replace(/\\/g, '/')
    .replace(/\.\.+/g, '.')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function inferMediaType(rawType: unknown, rawMime: unknown): 'image' | 'video' | null {
  const normalized = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';
  if (normalized === 'image' || normalized === 'video') return normalized;
  const mime = typeof rawMime === 'string' ? rawMime.toLowerCase() : '';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

function normalizeAspect(raw?: unknown): '16:9' | '9:16' | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '16:9' || value === '16-9') return '16:9';
  if (value === '9:16' || value === '9-16') return '9:16';
  return null;
}

function inferAspectFromUrl(url?: string | null): '16:9' | '9:16' | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('aspect');
    return normalizeAspect(raw);
  } catch {
    return null;
  }
}

function normalizeLinkUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

type ServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>;
type InsertClient = ServerClient | AdminClient;

// POST: inserimento autenticato con rate-limit via cookie
export async function POST(req: NextRequest) {
  try {
    const parsedBody = CreatePostSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedBody.success) {
      console.warn('[api/feed/posts][POST] invalid payload', parsedBody.error.flatten());
      return validationError('Payload non valido', parsedBody.error.flatten());
    }

    const body: CreatePostInput = parsedBody.data;
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const text = rawText.trim();
    const requestedKind = normKind(body?.kind ?? body?.type);
    const dbKind: DbPostKind = requestedKind === 'event' ? 'event' : 'normal';
    const rawEventPayload = body?.event_payload ?? body?.event;
    const eventPayload = normalizeEventPayload(rawEventPayload);
    const rawMediaUrl = typeof body?.media_url === 'string' ? body.media_url.trim() : '';
    const rawMediaUrlCamel = typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
    const rawMediaType =
      typeof body?.media_type === 'string'
        ? body.media_type
        : typeof body?.mediaType === 'string'
          ? body.mediaType
          : '';
    const rawMediaPath =
      typeof body?.media_path === 'string'
        ? body.media_path
        : typeof body?.mediaPath === 'string'
          ? body.mediaPath
          : '';
    const rawMediaBucket =
      typeof body?.media_bucket === 'string'
        ? body.media_bucket
        : typeof body?.mediaBucket === 'string'
          ? body.mediaBucket
          : '';
    const rawMediaMime =
      typeof body?.media_mime === 'string'
        ? body.media_mime
        : typeof body?.mediaMime === 'string'
          ? body.mediaMime
          : '';
    const rawMediaAspect =
      typeof body?.media_aspect === 'string'
        ? body.media_aspect
        : typeof body?.mediaAspect === 'string'
          ? body.mediaAspect
          : '';
    const rawLinkUrl =
      typeof body?.link_url === 'string'
        ? body.link_url
        : typeof body?.linkUrl === 'string'
          ? body.linkUrl
          : '';
    const rawLinkTitle = typeof body?.link_title === 'string' ? body.link_title : body?.linkTitle;
    const rawLinkDescription =
      typeof body?.link_description === 'string' ? body.link_description : body?.linkDescription;
    const rawLinkImage = typeof body?.link_image === 'string' ? body.link_image : body?.linkImage;

    const normalizedMediaPath = rawMediaPath ? sanitizeStoragePath(rawMediaPath.trim()) : '';
    const mediaBucket = rawMediaBucket?.trim() || DEFAULT_POSTS_BUCKET;
    let mediaUrl = rawMediaUrl || rawMediaUrlCamel || null;
    let mediaType: 'image' | 'video' | null = inferMediaType(rawMediaType, rawMediaMime);
    const mediaAspect = normalizeAspect(rawMediaAspect) || inferAspectFromUrl(mediaUrl);
    const linkUrl = normalizeLinkUrl(rawLinkUrl);
    const linkTitle = typeof rawLinkTitle === 'string' ? rawLinkTitle.trim() || null : null;
    const linkDescription =
      typeof rawLinkDescription === 'string' ? rawLinkDescription.trim() || null : null;
    const linkImage = normalizeLinkUrl(rawLinkImage);
    const quotedPostId = (body.quoted_post_id ?? body.quotedPostId ?? null) || null;
    const isEvent = requestedKind === 'event';

    if (!isEvent && !text && !mediaUrl && !normalizedMediaPath && !linkUrl && !quotedPostId) {
      return validationError('Scrivi un testo, un link o allega un media.', { error: 'empty' });
    }
    if (text.length > MAX_CHARS) {
      return validationError('Contenuto troppo lungo', { error: 'too_long', limit: MAX_CHARS });
    }

    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClientOrNull();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return notAuthenticated('Utente non autenticato');
    }

    let actorRole: Role | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, type')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      actorRole =
        normRole((profile as any)?.account_type) ||
        normRole((profile as any)?.type) ||
        normRole(auth.user.user_metadata?.role);
    } catch {
      actorRole = null;
    }

    if (isEvent && actorRole !== 'club') {
      return notAuthorized('Solo i club possono creare eventi.');
    }

    if (isEvent && !eventPayload) {
      return validationError("Titolo e data dell'evento sono obbligatori.", { error: 'invalid_event' });
    }

    let quotedRootId: string | null = null;

    if (quotedPostId) {
      const { data: quoted, error: quotedError } = await supabase
        .from('posts')
        .select('id, quoted_post_id')
        .eq('id', quotedPostId)
        .maybeSingle();

      if (quotedError || !quoted) {
        return notFoundError('Post originale non trovato o non accessibile');
      }

      quotedRootId = quoted.quoted_post_id ?? quoted.id;
    }

    if (!mediaUrl && normalizedMediaPath) {
      const { data: publicInfo } = supabase.storage.from(mediaBucket).getPublicUrl(normalizedMediaPath);
      if (publicInfo?.publicUrl) {
        mediaUrl = publicInfo.publicUrl;
      } else {
        return dbError('Impossibile generare il link pubblico del media.', {
          error: 'media_public_url_failed',
        });
      }
    }

    if (mediaUrl && !mediaType) {
      mediaType = inferMediaType(rawMediaType, rawMediaMime) || 'image';
    }

    if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) {
      return validationError("L'URL del media non è valido.", { error: 'invalid_media_url' });
    }

    const jar = await cookies();
    const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const now = Date.now();
    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      return rateLimited('Rate limit attivo', {
        error: 'rate_limited',
        retryInMs: RATE_LIMIT_MS - (now - lastTs),
      });
    }

    const effectiveText = text || '';
    const insertPayload: Record<string, any> = {
      content: effectiveText,
      author_id: auth.user.id,
      kind: dbKind,
    };
    if (mediaUrl) insertPayload.media_url = mediaUrl;
    if (mediaType) insertPayload.media_type = mediaType;
    if (mediaAspect && mediaType === 'video') insertPayload.media_aspect = mediaAspect;
    if (linkUrl) insertPayload.link_url = linkUrl;
    if (linkTitle) insertPayload.link_title = linkTitle;
    if (linkDescription) insertPayload.link_description = linkDescription;
    if (linkImage) insertPayload.link_image = linkImage;
    if (eventPayload && isEvent) insertPayload.event_payload = eventPayload;

    const fallbackPayload: Record<string, any> = {
      content: text || '',
      author_id: auth.user.id,
      kind: dbKind,
    };
    if (quotedRootId) {
      insertPayload.quoted_post_id = quotedRootId;
      fallbackPayload.quoted_post_id = quotedRootId;
    }
    if (mediaUrl) fallbackPayload.media_url = mediaUrl;
    if (mediaType) fallbackPayload.media_type = mediaType;

    const legacyInsertPayload: Record<string, any> = { ...insertPayload, kind: 'post' };
    const legacyFallbackPayload: Record<string, any> = { ...fallbackPayload, kind: 'post' };

    const runInsert = (client: InsertClient, payload: Record<string, any>, select: string) =>
      client.from('posts').insert(payload).select(select).single();

    const performInsert = async (client: InsertClient, payload: Record<string, any>, fallback: Record<string, any>) => {
      let data: any = null;
      let error: any = null;
      ({ data, error } = await runInsert(client, payload, SELECT_WITH_LINK));
      if (error && isMissingLinkColumns(error)) {
        const { link_url: _linkUrl, link_title: _linkTitle, link_description: _linkDescription, link_image: _linkImage, ...rest } =
          payload;
        ({ data, error } = await runInsert(client, rest, SELECT_WITH_MEDIA));
      }
      if (error && isMissingMediaColumns(error)) {
        ({ data, error } = await runInsert(client, fallback, SELECT_BASE));
      }
      return { data, error };
    };

    let { data, error } = await performInsert(supabase, insertPayload, fallbackPayload);

    if (error && admin && isRlsError(error)) {
      ({ data, error } = await performInsert(admin, insertPayload, fallbackPayload));
    }

    if (error && dbKind === 'normal' && isKindConstraintError(error)) {
      ({ data, error } = await performInsert(supabase, legacyInsertPayload, legacyFallbackPayload));
      if (error && admin && isRlsError(error)) {
        ({ data, error } = await performInsert(admin, legacyInsertPayload, legacyFallbackPayload));
      }
    }
    if (error) {
      console.error('createPost failed', { error, payload: insertPayload });
      reportApiError({
        endpoint: '/api/feed/posts',
        error,
        context: { stage: 'insert', method: 'POST' },
      });
      if (isRlsError(error)) {
        return rlsDenied('Permessi insufficienti per creare il post');
      }
      const detail = error?.details || error?.hint || '';
      const message = detail ? `${error.message}: ${detail}` : error.message;
      return dbError('Inserimento del post non riuscito', {
        error: 'insert_failed',
        message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
    }

    const authorMaps = await buildAuthorProfileMaps(supabase, data?.author_id ? [String(data.author_id)] : []);
    const enrichedRow = attachAuthorProfile(data, authorMaps);

    const res = successResponse({ item: normalizeRow(enrichedRow) }, { status: 201 });
    res.cookies.set(LAST_POST_TS_COOKIE, String(now), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err: any) {
    return unknownError({
      endpoint: '/api/feed/posts',
      error: err,
      context: { method: 'POST', stage: 'handler_catch' },
    });
  }
}
