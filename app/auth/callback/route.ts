export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function redirectWithError(url: URL, message: string) {
  const target = new URL('/login', url.origin);
  const trimmed = message.trim();
  if (trimmed) {
    target.searchParams.set('oauth_error', trimmed.slice(0, 120));
  }
  return NextResponse.redirect(target, { status: 302 });
}

function safeRedirect(url: URL, target: string | null) {
  if (!target) return new URL('/feed', url.origin);
  if (target.startsWith('/')) {
    return new URL(target, url.origin);
  }
  return new URL('/feed', url.origin);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const errorParam =
    url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (errorParam) {
    return redirectWithError(url, errorParam);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return redirectWithError(url, 'Missing auth code');
  }

  const supabase = await getServerSupabase();
  const auth = supabase.auth as any;

  try {
    await auth.exchangeCodeForSession(code);
  } catch (err) {
    try {
      await auth.exchangeCodeForSession({ authCode: code });
    } catch (inner) {
      const msg = inner instanceof Error ? inner.message : 'Auth exchange failed';
      return redirectWithError(url, msg);
    }
  }

  const redirectTo = url.searchParams.get('redirect_to');
  return NextResponse.redirect(safeRedirect(url, redirectTo), { status: 302 });
}
