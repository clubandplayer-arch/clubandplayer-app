import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const MAX_CHARS = 500;
const RATE_LIMIT_MS = 5000;
const LAST_POST_TS_COOKIE = 'feed_last_post_ts';

/** Supabase client con bridge cookie compatibile con @supabase/ssr@0.7.x */
async function getSupabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // mappa tutti i cookie correnti → { name, value }
        getAll() {
          return jar.getAll().map(({ name, value }) => ({ name, value }));
        },
        // applica tutte le mutazioni richieste da Supabase (set / delete)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Next 15: set(name, value, options)
              jar.set(name, value, options);
            });
          } catch {
            // no-op: in ambienti read-only il fallback è safe
          }
        },
      },
    }
  );
}

/** GET: ultimi post dal DB, con shape legacy { id, text, createdAt, role } */
export async function GET() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('posts')
    .select('id, body, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ items: [] }, { status: 200 });

  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    text: (r as any).body as string,
    createdAt: (r as any).created_at as string,
    // compat UI legacy: non dovrebbe servire, ma lo lasciamo
    role: 'athlete' as const,
  }));

  return NextResponse.json({ items }, { status: 200 });
}

/** POST: crea un post autenticato + rate-limit via cookie (5s) */
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const supabase = await getSupabase();

  // rate-limit semplice via cookie
  const lastTsRaw = jar.get(LAST_POST_TS_COOKIE)?.value;
  const lastTs = lastTsRaw ? Number(lastTsRaw) : 0;
  const now = Date.now();
  if (lastTs && now - lastTs < RATE_LIMIT_MS) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryInMs: RATE_LIMIT_MS - (now - lastTs) },
      { status: 429 }
    );
  }

  const payload = await req.json().catch(() => ({}));
  const text = String(payload?.text ?? '').trim();
  if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ ok: false, error: 'too_long', limit: MAX_CHARS }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: auth.user.id, body: text })
    .select('id, body, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
  }

  // aggiorna rate-limit cookie
  jar.set(LAST_POST_TS_COOKIE, String(now), {
    httpOnly: false,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });

  const item = {
    id: data.id as string,
    text: (data as any).body as string,
    createdAt: (data as any).created_at as string,
    role: 'athlete' as const,
  };

  return NextResponse.json({ ok: true, item }, { status: 201 });
}
