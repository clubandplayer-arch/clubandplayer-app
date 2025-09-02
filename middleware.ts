import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware "neutro": non fa controlli di auth.
 * Serve solo a escludere le rotte pubbliche e le risorse statiche
 * dall'esecuzione del middleware (riduce il rischio di 500).
 *
 * L'autenticazione è gestita lato client da components/auth/AuthGuard.tsx
 * dentro i layout dei gruppi protetti (es. app/(dashboard)/layout.tsx).
 */
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

/**
 * Esegui il middleware su tutto tranne:
 * - _next (statici Next)
 * - file con estensione (css, js, immagini, font, ecc.)
 * - api (evita side-effects sulle route API)
 * - pagine pubbliche: /login, /reset-password, /update-password, /debug/env
 */
export const config = {
  matcher: [
    '/((?!_next|api|.*\\..*|login|reset-password|update-password|debug/env).*)',
  ],
};
