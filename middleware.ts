// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/login', '/signup', '/onboarding/:path*', '/club/:path*', '/player/:path*', '/staff/:path*', '/fan/:path*', '/feed/:path*', '/search/:path*', '/who-to-follow/:path*', '/opportunities/:path*', '/following/:path*', '/clubs/:path*', '/players/:path*', '/athletes/:path*', '/u/:path*', '/c/:path*', '/post/:path*', '/posts/:path*', '/api/feed/:path*', '/api/follows/:path*', '/api/search/:path*', '/api/opportunities/:path*', '/api/suggestions/:path*', '/api/profiles/public/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  let role: 'club' | 'athlete' | 'staff' | 'fan' | 'guest' = 'guest';
  let authenticated = false;
  let minimumProfileComplete = true;
  let minimumProfilePath = '/onboarding/choose-role';

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete' || raw === 'staff' || raw === 'fan') role = raw;
    minimumProfileComplete = Boolean(j?.profile?.minimum_profile_complete ?? j?.profile?.minimum_complete ?? role === 'guest');
    minimumProfilePath = (j?.profile?.minimum_profile_path || minimumProfilePath).toString();
  } catch {
    // guest
  }

  // Già loggato su /login o /signup?
  // - con ruolo assegnato => bacheca
  // - senza ruolo => onboarding scelta ruolo obbligatoria
  if (authenticated && (pathname === '/login' || pathname === '/signup')) {
    const target = role === 'guest' ? '/onboarding/choose-role' : '/feed';
    return NextResponse.redirect(new URL(target, url));
  }

  // Utente autenticato senza ruolo: onboarding obbligatorio su qualunque path /onboarding/*
  if (authenticated && role === 'guest' && pathname.startsWith('/onboarding/')) {
    if (pathname !== '/onboarding/choose-role') {
      return NextResponse.redirect(new URL('/onboarding/choose-role', url));
    }
  }

  const minimumProfileAllowedPaths = new Set(['/player/profile', '/club/profile', '/staff/profile', '/fan/profile']);
  if (authenticated && role !== 'guest' && !minimumProfileComplete && !minimumProfileAllowedPaths.has(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Completa il tuo profilo per continuare.', redirectTo: minimumProfilePath },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL(minimumProfilePath, url));
  }

  // Rotte /club/* solo per club
  if (pathname.startsWith('/club/') && role !== 'club') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  // Rotte opportunità non disponibili per i fan
  if (pathname.startsWith('/opportunities') && role === 'fan') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  // Rotte /fan/* solo per fan
  if (pathname.startsWith('/fan/') && role !== 'fan') {
    if (role === 'club') return NextResponse.redirect(new URL('/club/profile', url));
    if (role === 'athlete' || role === 'staff') return NextResponse.redirect(new URL('/player/profile', url));
    return NextResponse.redirect(new URL('/login?next=%2Ffan%2Fprofile', url));
  }

  return NextResponse.next();
}
