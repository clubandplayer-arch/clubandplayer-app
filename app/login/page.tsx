// app/login/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SocialLogin from '@/components/auth/SocialLogin';

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const HAS_ENV   = Boolean(SUPA_URL && SUPA_ANON);


function sanitizeRedirect(input: string | null, origin: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input, origin);
    if (u.origin !== origin) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return input.startsWith('/') ? input : null;
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const emailId = 'login-email';
  const passwordId = 'login-password';
  const errorId = errorMsg ? 'login-error' : undefined;

  const BUILD_TAG = 'login-v6 Google+Email cookie-sync + redirect_to';

  const origin   = typeof window !== 'undefined' ? window.location.origin   : '';
  const oauthReady = useMemo(() => HAS_ENV && Boolean(origin), [origin]);

  // Salva l'eventuale ?redirect_to= in sessionStorage per l'uso in /auth/callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const rt = sanitizeRedirect(params.get('redirect_to'), window.location.origin);
      if (rt) {
        sessionStorage.setItem('auth:redirect_to', rt);
      } else {
        // se non valido, puliamo
        sessionStorage.removeItem('auth:redirect_to');
      }
    } catch {
      // ignora
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!HAS_ENV) return;
    (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPA_URL, SUPA_ANON);
      const { data: { user } } = await supabase.auth.getUser();
      if (active) setCurrentEmail(user?.email ?? null);
    })();
    return () => { active = false; };
  }, []);

  async function signInEmail(e: React.FormEvent) {
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

      const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!session) throw new Error('Sessione mancante dopo login');

      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Sync cookie fallito');
      }

      // Se abbiamo un redirect_to valido, andiamo lì, altrimenti home
      let target: string | null = null;
      try {
        target = sanitizeRedirect(sessionStorage.getItem('auth:redirect_to'), window.location.origin);
      } catch {}
      router.replace(target || '/');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Errore login');
    } finally {
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
    <main
      className="min-h-screen bg-clubplayer-gradient flex items-center justify-center p-6"
      aria-labelledby="login-heading"
    >
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 id="login-heading" className="text-xl font-semibold">
            Login
          </h1>
          <span className="text-[10px] rounded bg-gray-100 px-2 py-0.5 text-gray-600" title={BUILD_TAG}>
            {BUILD_TAG}
          </span>
        </div>

        {!HAS_ENV && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
            Variabili mancanti:
            <pre className="mt-1 whitespace-pre-wrap text-xs">
{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY`}
            </pre>
          </div>
        )}

        {oauthReady ? (
          <div className="space-y-3">
            <SocialLogin />
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-gray-200" />
              <span>oppure</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
            Google OAuth non abilitato su questo dominio (<code>{origin || 'n/d'}</code>).
          </div>
        )}

        {errorMsg && (
          <p id={errorId} className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {errorMsg}
          </p>
        )}

        <form
          onSubmit={signInEmail}
          className="space-y-3"
          aria-describedby={errorId}
          noValidate
        >
          <div className="space-y-1">
            <label htmlFor={emailId} className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              placeholder="email@esempio.com"
              className="w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-invalid={Boolean(errorMsg)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={passwordId} className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-md border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(errorMsg)}
            />
          </div>
          <button
            disabled={loading || !HAS_ENV}
            type="submit"
            className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        {currentEmail && (
          <div className="mt-2 text-center text-xs text-gray-600">
            Sei loggato come <strong>{currentEmail}</strong>.{' '}
            <button onClick={signOut} className="underline">Esci</button>
          </div>
        )}
      </div>
    </main>
  );
}
