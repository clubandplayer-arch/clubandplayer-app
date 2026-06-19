// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/login', '/signup', '/onboarding/:path*', '/club/:path*', '/opportunities/:path*', '/fan/:path*', '/feed/:path*', '/search/:path*', '/who-to-follow/:path*', '/following/:path*', '/players/:path*', '/clubs/:path*', '/messages/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  let role: 'club' | 'athlete' | 'staff' | 'fan' | 'guest' = 'guest';
  let authenticated = false;
  let minimumProfileComplete: boolean | null = null;
  let profileCompletionPath = '/player/profile';

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete' || raw === 'staff' || raw === 'fan') role = raw;
    if (typeof j?.profile?.minimumProfileComplete === 'boolean') minimumProfileComplete = j.profile.minimumProfileComplete;
    if (typeof j?.profile?.profileCompletionPath === 'string') profileCompletionPath = j.profile.profileCompletionPath;
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

  if (authenticated && role !== 'guest' && minimumProfileComplete === false) {
    const allowed = pathname === profileCompletionPath || pathname.startsWith(`${profileCompletionPath}/`) || pathname === '/logout';
    if (!allowed) return NextResponse.redirect(new URL(`${profileCompletionPath}?complete=1`, url));
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
