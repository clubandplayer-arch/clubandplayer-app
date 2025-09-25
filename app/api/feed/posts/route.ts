import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

type Role = 'club' | 'athlete' | 'guest';

type FeedPost = {
  id: string;
  text: string;
  createdAt: string; // ISO
  role: Exclude<Role, 'guest'>; // solo club/athlete possono postare
};

const POSTS_COOKIE = 'feed_posts_v1';
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';
const MAX_POSTS = 20;
const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5000;

// Helpers cookie-safe parse/stringify
function safeParse<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

// Simpla whoami proxy (facoltativo: si può rendere più stretto usando solo la UI)
// Qui tentiamo di leggere /api/auth/whoami lato server? No, teniamolo lato client.
// In API, ci fidiamo del client? Solo per stub: sì. In reale: validare JWT.
async function readRoleFromHeaders(req: NextRequest): Promise<Role> {
  // Stub: in mancanza di auth server-side, accettiamo header opzionale X-Role messo dal client? No.
  // Manteniamo 'guest' e lasciamo alla UI il blocco publish. Ma se qualcuno chiama l’API, blocchiamo.
  return 'guest';
}

// GET: ritorna i post stub (dal cookie)
export async function GET() {
  const jar = await cookies();
  const posts = safeParse<FeedPost[]>(jar.get(POSTS_COOKIE)?.value, []);
  // Ordine: più recenti in alto (già li salviamo in testa)
  return NextResponse.json({ items: posts }, { status: 200 });
}

// POST: crea un post (solo club/athlete), rate-limited
export async function POST(req: NextRequest) {
  const jar = await cookies();

  // In uno stub, non avendo auth server-side, accettiamo solo se la UI è corretta.
  // Per sicurezza, imponiamo rate-limit e validazione contenuto.
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? '').toString();
    const role = (body?.role ?? '').toString().toLowerCase() as Role;

    if (role !== 'club' && role !== 'athlete') {
      return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
    }

    const text = rawText.trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ ok: false, error: 'too_long', limit: MAX_CHARS }, { status: 400 });
    }

    // rate-limit per utente (stub globale per browser, dato che è per-cookie)
    const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
    const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
    const now = Date.now();
    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      const waitMs = RATE_LIMIT_MS - (now - lastTs);
      return NextResponse.json(
        { ok: false, error: 'rate_limited', retryInMs: waitMs },
        { status: 429 },
      );
    }

    const posts = safeParse<FeedPost[]>(jar.get(POSTS_COOKIE)?.value, []);
    const newPost: FeedPost = {
      id: crypto.randomUUID(),
      text,
      createdAt: nowIso(),
      role, // 'club' | 'athlete'
    };

    const next = [newPost, ...posts].slice(0, MAX_POSTS);

    jar.set(POSTS_COOKIE, JSON.stringify(next), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
    });
    jar.set(LAST_POST_TS_COOKIE, String(now), {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true, item: newPost }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}
