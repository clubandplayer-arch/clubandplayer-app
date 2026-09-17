// middleware.ts (root)
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|assets|brand|branding|icons|logo-cp.svg|email-logo.png|apple-touch-icon.png|og.jpg).*)'],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Gli standard di sicurezza devono essere pubblici anche con un profilo
  // incompleto o un ente in attesa di verifica, senza dipendere dall'auth API.
  if (pathname === '/legal/child-safety' || pathname === '/legal/child-safety/') {
    return NextResponse.next();
  }

  let role: 'club' | 'athlete' | 'staff' | 'fan' | 'admin' | 'institution' | 'guest' = 'guest';
  let authenticated = false;
  let profileComplete = true;
  let completionPath = '/player/profile';

  try {
    const r = await fetch(new URL('/api/auth/whoami', url.origin), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    const j = await r.json().catch(() => ({}));
    authenticated = !!j?.user?.id;
    const raw = (j?.role ?? '').toString().toLowerCase();
    if (raw === 'club' || raw === 'athlete' || raw === 'staff' || raw === 'fan' || raw === 'admin' || raw === 'institution') role = raw;
    profileComplete = j?.profile?.is_complete !== false;
    completionPath = (j?.profile?.completion_path || '').toString() || completionPath;
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
  if (authenticated && role !== 'guest' && pathname === '/onboarding/choose-role') {
    return NextResponse.redirect(new URL('/feed', url));
  }

  if (authenticated && role === 'guest' && pathname.startsWith('/onboarding/')) {
    if (pathname !== '/onboarding/choose-role') {
      return NextResponse.redirect(new URL('/onboarding/choose-role', url));
    }
  }


  if (authenticated && role !== 'guest' && !profileComplete) {
    if (pathname !== completionPath) {
      return NextResponse.redirect(new URL(completionPath, url));
    }
  }

  const isPublicAdminProfilePath = /^\/admin\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname);

  // Rotte /admin/* solo per admin, tranne la pagina pubblica del profilo admin.
  if (pathname.startsWith('/admin/') && !isPublicAdminProfilePath && role !== 'admin') {
    return NextResponse.redirect(new URL(authenticated ? '/feed' : '/login?next=%2Fadmin%2Fprofile', url));
  }

  if (authenticated && role === 'admin' && pathname === '/player/profile') {
    return NextResponse.redirect(new URL('/admin/profile', url));
  }

  // Gli enti non verificati possono restare solo nel flusso di verifica documentale.
  if (authenticated && role === 'institution') {
    let institutionVerified = false;
    try {
      const verificationRes = await fetch(new URL('/api/institution/verification/status', url.origin), {
        headers: { cookie: req.headers.get('cookie') || '' },
        cache: 'no-store',
      });
      const verificationJson = await verificationRes.json().catch(() => ({}));
      const request = verificationJson?.request;
      const verifiedUntil = request?.verified_until ? new Date(String(request.verified_until)) : null;
      institutionVerified =
        request?.status === 'approved' &&
        (!verifiedUntil || Number.isNaN(verifiedUntil.getTime()) || verifiedUntil.getTime() > Date.now());
    } catch {
      institutionVerified = false;
    }

    const institutionAllowedPath = pathname === '/institution/verification' || pathname === '/logout';
    if (!institutionVerified && !institutionAllowedPath) {
      return NextResponse.redirect(new URL('/institution/verification', url));
    }
  }

  // Rotte /institution/* solo per ente istituzionale
  if (pathname.startsWith('/institution/') && role !== 'institution') {
    return NextResponse.redirect(new URL(authenticated ? '/feed' : '/login?next=%2Finstitution%2Fverification', url));
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
    if (role === 'staff') return NextResponse.redirect(new URL('/staff/profile', url));
    if (role === 'athlete') return NextResponse.redirect(new URL('/player/profile', url));
    return NextResponse.redirect(new URL('/login?next=%2Ffan%2Fprofile', url));
  }

  return NextResponse.next();
}
