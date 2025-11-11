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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase anon non configurato');
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}

// GET: lettura pubblica, normalizza i campi per la UI legacy
export async function GET(req: NextRequest) {
  const debug = new URL(req.url).searchParams.get('debug') === '1';

  try {
    const supabase = getSupabaseAnonServer();

    const { data, error } = await supabase
      .from('posts')
      .select('id, author_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[feed/posts] GET error', error);
      return NextResponse.json(
        {
          ok: false,
          items: [],
          error: 'db_error',
          ...(debug
            ? { _debug: { message: error.message, details: error.details } }
            : {}),
        },
        { status: 200 }
      );
    }

    const items =
      (data ?? []).map((r) => ({
        id: r.id,
        text: r.content ?? '',
        createdAt: r.created_at,
        content: r.content ?? '',
        created_at: r.created_at,
        authorId: r.author_id ?? null,
        author_id: r.author_id ?? null,
        // compat vecchia UI, non usato ora
        role: undefined as unknown as 'club' | 'athlete' | undefined,
      })) || [];

    return NextResponse.json(
      {
        ok: true,
        items,
        ...(debug ? { _debug: { count: items.length } } : {}),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[feed/posts] GET fatal', err);
    return NextResponse.json(
      { ok: false, items: [], error: 'fatal' },
      { status: 200 }
    );
  }
}

// POST: inserimento autenticato con rate-limit via cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const text = rawText.trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: 'empty' },
        { status: 400 }
      );
    }

    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { ok: false, error: 'too_long', limit: MAX_CHARS },
        { status: 400 }
      );
    }

    // 👇 differenza: cookies() è async, quindi:
    const jar = await cookies();
    const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const now = Date.now();

    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      return NextResponse.json(
        {
          ok: false,
          error: 'rate_limited',
          retryInMs: RATE_LIMIT_MS - (now - lastTs),
        },
        { status: 429 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { ok: false, error: 'not_authenticated' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content: text,
        author_id: user.id,
      })
      .select('id, author_id, content, created_at')
      .single();

    if (error || !data) {
      console.error('[feed/posts] POST insert_failed', error);
      return NextResponse.json(
        {
          ok: false,
          error: 'insert_failed',
          details: error?.message,
        },
        { status: 400 }
      );
    }

    const res = NextResponse.json(
      {
        ok: true,
        item: {
          id: data.id,
          text: data.content ?? '',
          createdAt: data.created_at,
          content: data.content ?? '',
          created_at: data.created_at,
          authorId: data.author_id ?? null,
          author_id: data.author_id ?? null,
          role: undefined as unknown as 'club' | 'athlete' | undefined,
        },
      },
      { status: 201 }
    );

    // cookies() async anche qui
    const jarSet = await cookies();
    jarSet.set(LAST_POST_TS_COOKIE, String(now), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error('[feed/posts] POST invalid_request', err);
    return NextResponse.json(
      { ok: false, error: 'invalid_request' },
      { status: 400 }
    );
  }
}
