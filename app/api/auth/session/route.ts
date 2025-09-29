// app/api/auth/session/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function mergeCookies(from: NextResponse, into: NextResponse) {
  // Copia i cookie impostati dal "carrier" nella response finale
  for (const c of from.cookies.getAll()) into.cookies.set(c);
  const set = from.headers.get('set-cookie');
  if (set) into.headers.append('set-cookie', set);
}

export async function POST(req: NextRequest) {
  // "carrier" che riceve i Set-Cookie generati dal client SSR
  const carrier = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          carrier.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          carrier.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const body = await req.json().catch(() => ({} as any));
  const access_token =
    body?.access_token ?? body?.accessToken ?? body?.currentSession?.access_token ?? null;
  const refresh_token =
    body?.refresh_token ?? body?.refreshToken ?? body?.currentSession?.refresh_token ?? null;

  // Se non arrivano token, interpreta come "clear"
  if (!access_token || !refresh_token) {
    await supabase.auth.signOut().catch(() => {});
    const out = NextResponse.json({ ok: true, cleared: true });
    mergeCookies(carrier, out);
    return out;
  }

  // Imposta la sessione: questo popola i cookie sul "carrier"
  await supabase.auth.setSession({ access_token, refresh_token });

  // Propaga i cookie sulla response finale (quella che vede il browser)
  const out = NextResponse.json({ ok: true });
  mergeCookies(carrier, out);
  return out;
}
