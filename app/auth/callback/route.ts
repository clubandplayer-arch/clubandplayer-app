// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

async function makeServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        store.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
    cookieOptions: { sameSite: 'lax' },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (err) return NextResponse.json({ error: String(err) }, { status: 400 });
  if (!code) return NextResponse.json({ error: 'Missing auth code' }, { status: 400 });

  const supabase = await makeServerClient();

  // Scambia il codice con la sessione
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - compat firme diverse
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await supabase.auth.exchangeCodeForSession({ authCode: code });
  }

  // Determina destinazione
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return NextResponse.redirect(`${url.origin}/login`, { status: 302 });

  let redirectTo = `${url.origin}/onboarding`;

  try {
    // Club?
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (club?.id) {
      redirectTo = `${url.origin}/club/profile`;
    } else {
      // Atleta?
      const { data: prof } = await supabase
        .from('profiles')
        .select('id,type')
        .eq('id', userId)
        .maybeSingle();

      const t = String(prof?.type ?? '').toLowerCase();
      if (t === 'athlete') redirectTo = `${url.origin}/profile`;
    }
  } catch {
    // fallback rimane /onboarding
  }

  return NextResponse.redirect(redirectTo, { status: 302 });
}
