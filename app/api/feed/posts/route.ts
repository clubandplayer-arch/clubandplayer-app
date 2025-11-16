// app/api/feed/posts/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5_000;
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';

function getSupabaseAnonServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

function normalizeRow(row: any) {
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
    role: undefined as unknown as 'club' | 'athlete' | undefined,
  };
}

// GET: lettura pubblica, normalizza i campi per la UI legacy
export async function GET(req: NextRequest) {
  const debug = new URL(req.url).searchParams.get('debug') === '1';
  const supabase = getSupabaseAnonServer();

  const baseSelect = 'id, author_id, content, created_at';
  const extendedSelect = 'id, author_id, content, created_at, media_url, media_type';

  const fetchPosts = async (sel: string) =>
    supabase
      .from('posts')
      .select(sel)
      .order('created_at', { ascending: false })
      .limit(50);

  let data: any[] | null = null;
  let error: any = null;

  ({ data, error } = await fetchPosts(extendedSelect));

  if (error && /column .* does not exist/i.test(error.message || '')) {
    ({ data, error } = await fetchPosts(baseSelect));
  }

  if (error) {
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

  const items = (data ?? []).map((r) => normalizeRow(r)) || [];

  return NextResponse.json(
    {
      ok: true,
      items,
      ...(debug ? { _debug: { count: items.length } } : {}),
    },
    { status: 200 }
  );
}

// POST: inserimento autenticato con rate-limit via cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const mediaUrlRaw = (body as any)?.media_url ?? null;
    const mediaTypeRaw = (body as any)?.media_type ?? null;
    const text = rawText.trim();
    const mediaUrl = typeof mediaUrlRaw === 'string' && mediaUrlRaw.trim() ? mediaUrlRaw.trim() : null;
    const mediaType = mediaUrl
      ? (mediaTypeRaw === 'video' ? 'video' : 'image')
      : null;

    if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { ok: false, error: 'too_long', limit: MAX_CHARS },
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

    const supabase = await getSupabaseServerClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
    }

    const insertPayload: Record<string, any> = { content: text, author_id: auth.user.id };
    if (mediaUrl) insertPayload.media_url = mediaUrl;
    if (mediaType) insertPayload.media_type = mediaType;

    const runInsert = (payload: Record<string, any>, select: string) =>
      supabase.from('posts').insert(payload).select(select).single();

    let data: any = null;
    let error: any = null;

    ({ data, error } = await runInsert(insertPayload, 'id, author_id, content, created_at, media_url, media_type'));

    if (error && /column .* does not exist/i.test(error.message || '')) {
      const fallbackPayload = { content: mediaUrl ? `${text}\n${mediaUrl}` : text, author_id: auth.user.id };
      ({ data, error } = await runInsert(fallbackPayload, 'id, author_id, content, created_at'));
    }

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'insert_failed', details: error.message },
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
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}
