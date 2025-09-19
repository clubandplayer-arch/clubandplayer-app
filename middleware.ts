// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/login', '/signup', '/onboarding', '/club/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

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

  // (opzionale) /onboarding -> qui lasciamo passare sempre per ora.
  return NextResponse.next();
}
