// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const store = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: any) =>
        store.set({ name, value, ...options }),
      remove: (name: string, options: any) =>
        store.set({ name, value: '', ...options, maxAge: 0 }),
    } as any,
    cookieOptions: { sameSite: 'lax' },
  });
}

function safeNext(url: URL) {
  const raw = url.searchParams.get('redirect_to') || '/feed';
  return raw.startsWith('/') ? raw : '/feed';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url);

  const err =
    url.searchParams.get('error_description') || url.searchParams.get('error');
  if (err) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent(String(err))}`,
      { status: 302 }
    );
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent('Missing auth code')}`,
      { status: 302 }
    );
  }

  const supabase = await getServerSupabase();

  // Gestisce entrambe le versioni dell’SDK:
  // - nuova: exchangeCodeForSession({ authCode })
  // - vecchia: exchangeCodeForSession(code)
  try {
    await supabase.auth.exchangeCodeForSession({ authCode: code } as any);
  } catch {
    await (supabase.auth as any).exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${url.origin}${next}`, { status: 302 });
}
