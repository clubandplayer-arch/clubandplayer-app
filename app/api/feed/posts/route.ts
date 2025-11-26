// app/api/feed/posts/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { reportApiError } from '@/lib/monitoring/reportApiError';

export const runtime = 'nodejs';

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5_000;
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';

type Role = 'club' | 'athlete';
type PostKind = 'post' | 'event';

function normRole(v: unknown): Role | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'club') return 'club';
  if (s === 'athlete') return 'athlete';
  return null;
}

function normKind(raw: unknown): PostKind {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'event') return 'event';
  return 'post';
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

function normalizeRow(row: any) {
  const aspectFromUrl = inferAspectFromUrl(row.media_url);
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
    kind: row.kind ? normKind(row.kind) : 'post',
    event_payload: normalizeEventPayload(row.event_payload) ?? null,
    role: undefined as unknown as 'club' | 'athlete' | undefined,
  };
}

// GET: lettura autenticata, filtra i post per ruolo dell'autore
export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const debug = searchParams.get('debug') === '1';
  const mine = searchParams.get('mine') === '1';
  const limitRaw = Number(searchParams.get('limit') || '50');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.round(limitRaw), 1), 200) : 50;
  const supabase = await getSupabaseServerClient();

  // determina ruolo dell'utente corrente
  let currentRole: Role | null = null;
  let currentUserId: string | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      currentUserId = data.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type,type')
        .eq('user_id', data.user.id)
        .maybeSingle();
      currentRole =
        normRole((profile as any)?.account_type) ||
        normRole((profile as any)?.type) ||
        normRole(data.user.user_metadata?.role);
    }
  } catch {
    // se qualcosa fallisce, continuiamo senza ruolo
  }

  if (mine && !currentUserId) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const fetchPosts = async (sel: string) => {
    let query = supabase
      .from('posts')
      .select(sel)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (mine && currentUserId) {
      query = query.eq('author_id', currentUserId);
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
    return NextResponse.json(
      {
        ok: false,
        items: [],
        error: 'db_error',
        ...(debug ? { _debug: { message: error.message, details: error.details } } : {}),
      },
      { status: 200 }
    );
  }

  const rows = (data ?? []).map((r) => normalizeRow(r)) || [];

  if (mine) {
    return NextResponse.json(
      {
        ok: true,
        items: rows,
        ...(debug ? { _debug: { count: rows.length, mine: true, userId: currentUserId } } : {}),
      },
      { status: 200 }
    );
  }

  if (!currentRole) {
    return NextResponse.json(
      { ok: true, items: rows },
      { status: 200 }
    );
  }

  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id || r.authorId).filter(Boolean))
  ) as string[];

  let profiles: any[] = [];
  if (authorIds.length > 0) {
    const selectCols = 'user_id,id,account_type,type';
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select(selectCols)
      .in('user_id', authorIds);
    if (!profErr && Array.isArray(profs)) {
      profiles = profs;
    } else {
      const admin = getSupabaseAdminClientOrNull();
      if (admin) {
        const { data: adminProfs } = await admin
          .from('profiles')
          .select(selectCols)
          .in('user_id', authorIds);
        if (Array.isArray(adminProfs)) profiles = adminProfs;
      }
    }
  }

  const map = new Map<string, Role>();
  for (const p of profiles) {
    const key = (p?.user_id ?? p?.id ?? '').toString();
    const role = normRole(p?.account_type) || normRole(p?.type);
    if (key && role) map.set(key, role);
  }

  const filtered = rows.filter((r) => {
    const role = map.get((r.author_id || r.authorId || '').toString());
    return role ? role === currentRole : false;
  });

  return NextResponse.json(
    {
      ok: true,
      items: filtered,
      ...(debug ? { _debug: { count: filtered.length, role: currentRole, userId: currentUserId } } : {}),
    },
    { status: 200 }
  );
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

const SELECT_WITH_MEDIA =
  'id, author_id, content, created_at, media_url, media_type, media_aspect, kind, event_payload';
const SELECT_WITH_LINK = `${SELECT_WITH_MEDIA}, link_url, link_title, link_description, link_image`;
const SELECT_BASE = 'id, author_id, content, created_at, kind, event_payload';
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
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const text = rawText.trim();
    const requestedKind = normKind(body?.kind ?? body?.type);
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
    const isEvent = requestedKind === 'event';

    if (!isEvent && !text && !mediaUrl && !normalizedMediaPath && !linkUrl) {
      return NextResponse.json(
        { ok: false, error: 'empty', message: 'Scrivi un testo, un link o allega un media.' },
        { status: 400 }
      );
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ ok: false, error: 'too_long', limit: MAX_CHARS }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClientOrNull();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
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
      return NextResponse.json(
        { ok: false, error: 'forbidden', message: 'Solo i club possono creare eventi.' },
        { status: 403 }
      );
    }

    if (isEvent && !eventPayload) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_event',
          message: "Titolo e data dell'evento sono obbligatori.",
        },
        { status: 400 }
      );
    }

    if (!mediaUrl && normalizedMediaPath) {
      const { data: publicInfo } = supabase.storage.from(mediaBucket).getPublicUrl(normalizedMediaPath);
      if (publicInfo?.publicUrl) {
        mediaUrl = publicInfo.publicUrl;
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: 'media_public_url_failed',
            message: 'Impossibile generare il link pubblico del media.',
          },
          { status: 400 }
        );
      }
    }

    if (mediaUrl && !mediaType) {
      mediaType = inferMediaType(rawMediaType, rawMediaMime) || 'image';
    }

    if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_media_url', message: 'L\'URL del media non è valido.' },
        { status: 400 }
      );
    }

    const jar = await cookies();
    const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const now = Date.now();
    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      return NextResponse.json(
        { ok: false, error: 'rate_limited', retryInMs: RATE_LIMIT_MS - (now - lastTs) },
        { status: 429 }
      );
    }

    const effectiveText = text || '';
    const insertPayload: Record<string, any> = {
      content: effectiveText,
      author_id: auth.user.id,
      kind: requestedKind,
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
      kind: requestedKind,
    };
    if (mediaUrl) fallbackPayload.media_url = mediaUrl;
    if (mediaType) fallbackPayload.media_type = mediaType;

    const runInsert = (client: InsertClient, payload: Record<string, any>, select: string) =>
      client.from('posts').insert(payload).select(select).single();

    let data: any = null;
    let error: any = null;

    ({ data, error } = await runInsert(supabase, insertPayload, SELECT_WITH_LINK));

    if (error && isMissingLinkColumns(error)) {
      const { link_url: _linkUrl, link_title: _linkTitle, link_description: _linkDescription, link_image: _linkImage, ...rest } = insertPayload;
      ({ data, error } = await runInsert(supabase, rest, SELECT_WITH_MEDIA));
    }

    if (error && isMissingMediaColumns(error)) {
      ({ data, error } = await runInsert(supabase, fallbackPayload, SELECT_BASE));
    }

    if (error && admin && isRlsError(error)) {
      ({ data, error } = await runInsert(admin, insertPayload, SELECT_WITH_LINK));
      if (error && isMissingLinkColumns(error)) {
        const { link_url: _linkUrl, link_title: _linkTitle, link_description: _linkDescription, link_image: _linkImage, ...rest } =
          insertPayload;
        ({ data, error } = await runInsert(admin, rest, SELECT_WITH_MEDIA));
      }
      if (error && isMissingMediaColumns(error)) {
        ({ data, error } = await runInsert(admin, fallbackPayload, SELECT_BASE));
      }
    }

    if (error) {
      reportApiError({
        endpoint: '/api/feed/posts',
        error,
        context: { stage: 'insert', method: 'POST' },
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'insert_failed',
          message: error.message,
        },
        { status: 400 }
      );
    }

    const res = NextResponse.json(
      {
        ok: true,
        item: normalizeRow(data),
      },
      { status: 201 }
    );
    res.cookies.set(LAST_POST_TS_COOKIE, String(now), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err: any) {
    reportApiError({ endpoint: '/api/feed/posts', error: err, context: { method: 'POST', stage: 'handler_catch' } });
    return NextResponse.json({ ok: false, error: 'invalid_request', message: err?.message }, { status: 400 });
  }
}
