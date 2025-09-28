// app/api/feed/posts/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Limiti minimi lato API
const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5_000;
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';

// Client "anonimo" server-side: basta per SELECT con RLS `to public`
function getSupabaseAnonServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}

// GET: leggi i post (pubblico, senza sessione necessaria)
export async function GET(req: NextRequest) {
  const debug = new URL(req.url).searchParams.get('debug') === '1';
  const supabase = getSupabaseAnonServer();

  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        items: [],
        error: 'db_error',
        ...(debug ? { _debug: { message: error.message, details: error.details } } : {}),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      items: data ?? [],
      ...(debug ? { _debug: { count: data?.length ?? 0 } } : {}),
    },
    { status: 200 }
  );
}

// POST: crea un post (richiede utente loggato; RLS `insert to authenticated`)
// Accetta { text: string } oppure { content: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const text = rawText.trim();

    if (!text) {
      return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { ok: false, error: 'too_long', limit: MAX_CHARS },
        { status: 400 }
      );
    }

    // Rate-limit minimale via cookie (per evitare flood dal browser)
    const jar = await cookies();
    const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const now = Date.now();
    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      const retryInMs = RATE_LIMIT_MS - (now - lastTs);
      return NextResponse.json(
        { ok: false, error: 'rate_limited', retryInMs },
        { status: 429 }
      );
    }

    // Client server-side con cookie per usare la sessione
    const supabase = await getSupabaseServerClient();

    // Verifica utente
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
    }

    // Insert: RLS + trigger set_post_author() assegna author_id = auth.uid() se assente
    const { data, error } = await supabase
      .from('posts')
      .insert({ content: text })
      .select('id, author_id, content, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'insert_failed', details: error.message },
        { status: 400 }
      );
    }

    // Aggiorna rate-limit cookie nella risposta
    const res = NextResponse.json({ ok: true, item: data }, { status: 201 });
    res.cookies.set(LAST_POST_TS_COOKIE, String(now), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}
