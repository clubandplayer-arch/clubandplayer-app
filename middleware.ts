import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Rotte pubbliche (sempre accessibili, nessun redirect per login).
 * NB: /feed resta pubblico come da tua UX: home anche per guest.
 */
const PUBLIC_PATHS = new Set<string>([
  '/',           // verrà subito rediretto a /feed
  '/feed',
  '/onboarding',
  '/login',
  '/signup',
]);

/**
 * Prefissi/rotte che richiedono autenticazione.
 * Aggiungi qui altre aree riservate se/quando servono.
 */
const PROTECTED_PREFIXES = [
  '/profile',
  '/club/profile',
  '/opportunities/new',
  '/club/applicants',
];

/** true se la pathname richiede auth */
function requiresAuth(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

/** true se la pathname è pubblica */
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Root → /feed (sempre)
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/feed';
    return NextResponse.redirect(url);
  }

  // 2) Se non è rotta che richiede auth → passa
  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  // 3) Per le rotte protette, verifica autenticazione
  //    Usiamo /api/auth/whoami (escluso dal matcher) e inoltriamo i cookie
  try {
    const whoamiUrl = new URL('/api/auth/whoami', req.url);
    const res = await fetch(whoamiUrl, {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });

    let authed = false;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      authed = Boolean(data?.id || data?.email);
    }

    if (!authed) {
      // Evita loop: non ridirigere se già in una pagina pubblica
      if (!isPublicPath(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = '/onboarding';
        url.searchParams.set('next', pathname); // per redirect post-login
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // In caso di errore improvviso nell'auth check, lascia passare:
    // meglio degradare a pubblico che bloccare.
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Matcher:
 * - esclude /api (incluso /api/auth/whoami), asset statici e immagini
 * - intercetta tutto il resto
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|images).*)',
  ],
};
