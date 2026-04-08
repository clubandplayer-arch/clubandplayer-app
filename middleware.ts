// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/login', '/signup', '/onboarding/:path*', '/club/:path*', '/opportunities/:path*'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  let role: 'club' | 'athlete' | 'fan' | 'guest' = 'guest';
  let authenticated = false;

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete' || raw === 'fan') role = raw;
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

  // Rotte /club/* solo per club
  if (pathname.startsWith('/club/') && role !== 'club') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  // Rotte opportunità non disponibili per i fan
  if (pathname.startsWith('/opportunities') && role === 'fan') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  return NextResponse.next();
}
