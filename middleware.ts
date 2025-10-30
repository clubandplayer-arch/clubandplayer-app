// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  // Aggiungiamo /clubs per intercettarlo lato edge PRIMA del rendering
  matcher: ['/login', '/signup', '/onboarding', '/club/:path*', '/clubs'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // BLOCCO /clubs: rispondiamo 404 con una mini pagina HTML che rimanda alla home
  if (pathname === '/clubs') {
    const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>404 — Pagina non trovata | Club&Player</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
           background: #fafafa; color:#111; min-height:100vh; display:flex; align-items:center; justify-content:center; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:24px; text-align:center;
            box-shadow:0 2px 8px rgba(0,0,0,.05); max-width:520px; margin:24px; }
    h1 { font-size:22px; margin:0 0 8px; }
    p { margin:0 0 14px; color:#555; }
    a { display:inline-block; padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; text-decoration:none; color:#111; }
    a:hover { background:#f6f6f6; }
    @media (prefers-color-scheme: dark) {
      body { background:#0a0a0a; color:#eee; }
      .card { background:#111; border-color:#27272a; box-shadow:none; }
      p { color:#aaa; }
      a { color:#eee; border-color:#27272a; }
      a:hover { background:#18181b; }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>404 — Pagina non trovata</h1>
    <p>La pagina <code>/clubs</code> non è disponibile. Torna alla home.</p>
    <a href="/">Torna alla homepage</a>
  </div>
</body>
</html>`;
    return new NextResponse(html, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Auth/context (solo per le rotte che vogliamo gestire qui)
  let role: 'club' | 'athlete' | 'guest' = 'guest';
  let authenticated = false;

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete') role = raw;
  } catch {
    // guest
  }

  // Già loggato su /login o /signup? Vai in bacheca
  if (authenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/feed', url));
  }

  // Rotte /club/* solo per club
  if (pathname.startsWith('/club/') && role !== 'club') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  // /onboarding: lasciamo passare sempre
  return NextResponse.next();
}
