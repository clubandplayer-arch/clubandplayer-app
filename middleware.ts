// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/login', '/signup', '/onboarding/:path*', '/club/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  let role: 'club' | 'athlete' | 'fan' | 'guest' = 'guest';
  let authenticated = false;
  let accountType: 'club' | 'athlete' | 'fan' | null = null;

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete' || raw === 'fan') role = raw;

    const rawAccountType = (j?.profile?.account_type ?? '').toString().toLowerCase();
    if (rawAccountType === 'club' || rawAccountType === 'athlete' || rawAccountType === 'fan') {
      accountType = rawAccountType;
    }
  } catch {
    // guest
  }

  // Già loggato su /login o /signup? Vai in bacheca
  if (authenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/feed', url));
  }

  if (pathname.startsWith('/onboarding/choose-role')) {
    if (!authenticated) {
      return NextResponse.redirect(new URL('/login?next=%2Fonboarding%2Fchoose-role', url));
    }
    if (accountType) {
      return NextResponse.redirect(new URL('/feed', url));
    }
  }

  // Rotte /club/* solo per club
  if (pathname.startsWith('/club/') && role !== 'club') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  return NextResponse.next();
}
