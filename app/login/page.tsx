'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const HAS_ENV = Boolean(SUPA_URL && SUPA_ANON);

// Consente OAuth su: localhost, produzione e QUALSIASI preview *.vercel.app
function isAllowedOAuthOrigin(origin: string) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const { hostname, port } = url;

    // localhost (3000/3001)
    if (hostname === 'localhost' && (port === '3000' || port === '3001' || port === '')) {
      return true;
    }

    // produzione
    if (hostname === 'clubandplayer-app.vercel.app') return true;

    // preview di Vercel (*.vercel.app)
    if (hostname.endsWith('.vercel.app')) return true;

    return false;
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const BUILD_TAG = 'login-v4.0-callback-cookies';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const oauthAllowedHere = useMemo(() => isAllowedOAuthOrigin(origin), [origin]);

  // Lazy-load supabase-js SOLO lato client e dopo il mount
  useEffect(() => {
    let active = true;
    if (!HAS_ENV) return;

    (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPA_URL, SUPA_ANON);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (active) setCurrentEmail(user?.email ?? null);
    })();

    return () => {
      active = false;
    };
  }, []);

  async function signInEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    if (!HAS_ENV) {
      setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*');
      return;
    }
    setLoading(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPA_URL, SUPA_ANON);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore login';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setErrorMsg(null);

    if (!HAS_ENV) {
      setErrorMsg('Config mancante: NEXT_PUBLIC_SUPABASE_*');
      return;
    }
    if (!oauthAllowedHere) {
      setErrorMsg('Per usare Google, apri una Preview Vercel o la Production.');
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPA_URL, SUPA_ANON);

      // Redirect verso il callback che imposta i cookie SSR
      const redirectTo = `${origin}/auth/callback?redirect=/profile`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'consent' }, // opzionale
        },
      });
      if (error) throw error;

      if (data?.url) {
        window.location.assign(data.url);
      } else {
        // Fallback manuale (non dovrebbe servire)
        const authorize = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
          redirectTo
        )}`;
        window.location.assign(authorize);
      }
    } catch (err) {
      console.error('OAuth error:', err);
      const msg = err instanceof Error ? err.message : 'Errore OAuth';
      setErrorMsg(msg);
      setLoading(false);
    }
  }

  async function signOut() {
    if (!HAS_ENV) return;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPA_URL, SUPA_ANON);
    await supabase.auth.signOut();
    setCurrentEmail(null);
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Login</h1>
          <span
            className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600"
            data-build={BUILD_TAG}
            title={BUILD_TAG}
          >
            {BUILD_TAG}
          </span>
        </div>

        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti per questa build:
            <pre className="mt-1 whitespace-pre-wrap text-xs">
              {`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY`}
            </pre>
          </div>
        )}

        {!oauthAllowedHere && (
          <div className="rounded-md border border-blue-300 bg-blue-50 p-2 text-xs text-blue-800">
            Per il login con Google usa una <strong>Vercel Preview</strong> o la{' '}
            <a className="underline" href="https://clubandplayer-app.vercel.app/login">
              Production
            </a>
            . In ambienti non autorizzati continua con email/password.
          </div>
        )}

        <button
          type="button"
          onClick={signInGoogle}
          disabled={!HAS_ENV || !oauthAllowedHere || loading}
          className="w-full rounded-md border px-4 py-2 disabled:opacity-50"
          data-testid="google-btn"
          id="google-btn"
          aria-label="Continua con Google"
        >
          Continua con Google
        </button>

        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">oppure</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {errorMsg && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        <form onSubmit={signInEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            disabled={loading || !HAS_ENV}
            className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        {currentEmail && (
          <div className="mt-2 text-center text-xs text-gray-600">
            Sei loggato come <strong>{currentEmail}</strong>.{' '}
            <button onClick={signOut} className="underline">
              Esci
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
