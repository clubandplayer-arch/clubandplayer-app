import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_KEY = 'feed_posts_v1';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 anno
const POST_LIMIT = 50;
const MIN_INTERVAL_MS = 5000; // anti-spam: 5s tra un post e l'altro per utente

type Post = {
  id: string;
  text: string;
  createdAt: string; // ISO
};

type CookieShape = {
  posts: Post[];
  lastAt?: number; // epoch ms per anti-spam
};

async function readCookie(): Promise<CookieShape> {
  try {
    const store = await cookies(); // in questo progetto è async
    const raw = store.get(COOKIE_KEY)?.value ?? '';
    if (!raw) return { posts: [], lastAt: undefined };
    const parsed = JSON.parse(raw);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const lastAt = typeof parsed?.lastAt === 'number' ? parsed.lastAt : undefined;
    return { posts, lastAt };
  } catch {
    return { posts: [], lastAt: undefined };
  }
}

async function writeCookie(data: CookieShape) {
  const store = await cookies();
  store.set(COOKIE_KEY, JSON.stringify(data), {
    path: '/',
    httpOnly: true, // solo server-side; la UI passa sempre dall'API
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function GET() {
  const { posts } = await readCookie();
  // ordina dal più recente
  const sorted = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return NextResponse.json({ items: sorted });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? '').toString().trim();

    if (!text) {
      return NextResponse.json({ ok: false, error: 'Testo vuoto' }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ ok: false, error: 'Testo troppo lungo (max 500 caratteri)' }, { status: 400 });
    }

    const now = Date.now();
    const { posts, lastAt } = await readCookie();

    if (typeof lastAt === 'number' && now - lastAt < MIN_INTERVAL_MS) {
      const waitMs = MIN_INTERVAL_MS - (now - lastAt);
      return NextResponse.json(
        { ok: false, error: 'Rallenta per favore', retryAfterMs: waitMs },
        { status: 429 },
      );
    }

    const post: Post = {
      id: `p_${now}`,
      text,
      createdAt: new Date(now).toISOString(),
    };

    const nextPosts = [post, ...posts].slice(0, POST_LIMIT);
    await writeCookie({ posts: nextPosts, lastAt: now });

    return NextResponse.json({ ok: true, post });
  } catch {
    return NextResponse.json({ ok: false, error: 'Errore inatteso' }, { status: 500 });
  }
}
