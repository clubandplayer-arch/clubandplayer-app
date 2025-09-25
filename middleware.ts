import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Pagine di autenticazione (da evitare se l'utente è già loggato) */
const AUTH_PAGES = new Set<string>(['/login', '/signup', '/onboarding']);

/** Rotte pubbliche (oltre alle auth) — /feed è pubblico secondo la tua UX */
const PUBLIC_PATHS = new Set<string>(['/', '/feed']);

/** Prefissi/rotte che richiedono autenticazione */
const PROTECTED_PREFIXES: readonly string[] = [
  '/profile',
  '/club/profile',
  '/club/applicants',
  '/opportunities/new',
];

/** True se la pathname richiede auth */
function requiresAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/** True se è una pagina di autenticazione */
function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.has(pathname);
}

/** True se la pathname è pubblica */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname, search } = url;

  // 1) Root → /feed
  if (pathname === '/') {
    url.pathname = '/feed';
    return NextResponse.redirect(url);
  }

  // 2) Se NON è protetta e NON è pagina auth → passa subito (niente fetch, più veloce)
  const needsCheck = requiresAuth(pathname) || isAuthPage(pathname);
  if (!needsCheck) {
    return NextResponse.next();
  }

  // 3) Verifica autenticazione chiamando whoami (inoltro cookie)
  let authed = false;
  try {
    const whoamiUrl = new URL('/api/auth/whoami', req.url);
    const res = await fetch(whoamiUrl, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      authed = Boolean(data?.id || data?.email);
    }
  } catch {
    // In caso di errore improvviso, degrada a non autenticato (comportamento conservativo)
    authed = false;
  }

  // 4) Anti-loop: se già loggato e stai andando su pagine auth → /feed
  if (authed && isAuthPage(pathname)) {
    url.pathname = '/feed';
    return NextResponse.redirect(url);
  }

  // 5) Se la rotta è protetta e NON sei loggato → /onboarding?next=…
  if (requiresAuth(pathname) && !authed) {
    const redir = req.nextUrl.clone();
    redir.pathname = '/onboarding';
    redir.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(redir);
  }

  // 6) Altrimenti passa
  return NextResponse.next();
}

/**
 * Matcher:
 * - esclude /api (incl. /api/auth/whoami), _next static, immagini e file comuni
 * - intercetta il resto
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webp|avif)).*)',
  ],
};
