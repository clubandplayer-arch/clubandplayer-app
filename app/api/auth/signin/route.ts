import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { email = '', password = '' } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e password richieste' }, { status: 400 });
  }

  // Prepariamo una risposta su cui poter scrivere i cookie
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // leggiamo dal REQUEST
        get(name) {
          return req.cookies.get(name)?.value;
        },
        // scriviamo sul RESPONSE
        set(name, value, options) {
          res.cookies.set(name, value, options);
        },
        remove(name, options) {
          // maxAge:0 = delete cookie
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Qui i Set-Cookie vengono effettivamente inviati al browser
  return res;
}
