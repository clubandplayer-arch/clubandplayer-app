// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json().catch(() => ({}));

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    // 1) Response "carrier" su cui il client Supabase scriverà i cookie
    const carrier = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,        // usa le tue ENV già presenti
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            carrier.cookies.set({ name, value, ...options }); // scrive sul carrier
          },
          remove(name: string, options: CookieOptions) {
            carrier.cookies.set({ name, value: '', ...options, maxAge: 0 }); // scrive sul carrier
          },
        },
      }
    );

    // 2) Imposta la sessione (qui Supabase popola i cookie sul "carrier")
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      return NextResponse.json({ error: `setSession: ${error.message}` }, { status: 401 });
    }

    // 3) (opzionale) valida l’utente, utile anche a triggerare eventuale refresh lato Supabase
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr) {
      // anche in errore, copiamo comunque i cookie del carrier
      const out = NextResponse.json({ error: `getUser: ${uerr.message}` }, { status: 500 });
      carrier.cookies.getAll().forEach(c => out.cookies.set(c)); // <<< COPIA COOKIE
      return out;
    }

    // 4) Costruiamo la risposta finale **copiando i cookie** dal carrier
    const out = NextResponse.json({ ok: true, user }, { status: 200 });
    carrier.cookies.getAll().forEach(c => out.cookies.set(c));  // <<< PASSO CHIAVE
    return out;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Bad request' }, { status: 400 });
  }
}
