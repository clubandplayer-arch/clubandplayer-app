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

function normRole(v: unknown): Role | null {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'club') return 'club';
  if (s === 'athlete') return 'athlete';
  return null;
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

// GET: lettura autenticata, filtra i post per ruolo dell'autore
export async function GET(req: NextRequest) {
  const debug = new URL(req.url).searchParams.get('debug') === '1';
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

// POST: inserimento autenticato con rate-limit via cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body?.text ?? body?.content ?? '').toString();
    const text = rawText.trim();
    const hasMedia = Boolean((body as any)?.media_url || (body as any)?.media_type);

    if (!text) {
      return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ ok: false, error: 'too_long', limit: MAX_CHARS }, { status: 400 });
    }

    if (hasMedia) {
      return NextResponse.json(
        { ok: false, error: 'media_not_supported', message: 'Il feed accetta solo post di testo.' },
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

    const runInsert = (payload: Record<string, any>, select: string) =>
      supabase.from('posts').insert(payload).select(select).single();

    let data: any = null;
    let error: any = null;

    ({ data, error } = await runInsert(insertPayload, 'id, author_id, content, created_at'));

    if (error && /column .* does not exist/i.test(error.message || '')) {
      ({ data, error } = await runInsert(insertPayload, 'id, author_id, content, created_at'));
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
