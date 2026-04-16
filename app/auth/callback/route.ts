export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SOCIAL_PROVIDERS = new Set(['google', 'apple']);

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

function htmlRedirect(target: URL) {
  const targetUrl = target.toString();
  const body = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="cache-control" content="no-store" />
    <meta http-equiv="refresh" content="0;url=${targetUrl}" />
    <title>Reindirizzamento…</title>
  </head>
  <body>
    <p>Reindirizzamento in corso…</p>
    <script>
      window.location.replace(${JSON.stringify(targetUrl)});
    </script>
  </body>
</html>`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
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

  const intent = url.searchParams.get('intent') ?? 'signin';
  const expectedProvider = (url.searchParams.get('provider') ?? '').toLowerCase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const appProvider = String((user as any)?.app_metadata?.provider ?? '').toLowerCase();
    const provider = SOCIAL_PROVIDERS.has(expectedProvider) ? expectedProvider : appProvider;
    const providerId = String((user as any)?.app_metadata?.provider_id ?? '').trim() || null;
    const email = String(user.email ?? '').trim().toLowerCase() || null;
    const emailVerified = Boolean((user as any)?.email_confirmed_at);

    if (provider && SOCIAL_PROVIDERS.has(provider)) {
      await supabase.from('user_auth_providers').upsert(
        {
          user_id: user.id,
          provider,
          provider_user_id: providerId,
          email,
          email_verified: emailVerified,
          last_sign_in_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      );
    }

    // Protezione anti-merge cieco: se arriva un NUOVO utente social ma esiste già
    // un account storico con la stessa email verificata (Google/Apple), NON merge automatico.
    if (intent === 'signin' && provider && email && emailVerified && SOCIAL_PROVIDERS.has(provider)) {
      const { data: profileForUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileForUser) {
        const { data: candidates } = await supabase
          .from('user_auth_providers')
          .select('user_id, provider')
          .eq('email', email)
          .eq('email_verified', true)
          .neq('user_id', user.id)
          .in('provider', ['google', 'apple'])
          .limit(2);

        if ((candidates?.length ?? 0) === 1) {
          await supabase.auth.signOut();
          const conflict = new URL('/login', url.origin);
          conflict.searchParams.set('link_required', '1');
          conflict.searchParams.set('provider', provider);
          conflict.searchParams.set('email', email);
          return NextResponse.redirect(conflict, { status: 302 });
        }
      }
    }
  }

  const redirectTo = url.searchParams.get('redirect_to');
  return htmlRedirect(safeRedirect(url, redirectTo));
}
