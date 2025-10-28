'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function safeNext(sp: URLSearchParams) {
  const raw = sp.get('redirect_to') || '/feed';
  return raw.startsWith('/') ? raw : '/feed';
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = supabaseBrowser();

  const next = useMemo(() => safeNext(search), [search]);

  // se il callback ti ha rimandato un errore OAuth lo mostriamo qui
  const initialErr = search.get('oauth_error') || null;
  const [error, setError] = useState<string | null>(initialErr);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?redirect_to=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      } as any);
      if (error) throw error;
      // Redireziona automaticamente verso Google → Supabase → /auth/callback
    } catch (e: any) {
      setError(e?.message || 'Errore login con Google');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Allinea cookie lato server per i route handlers (best effort)
      const at = data.session?.access_token;
      const rt = data.session?.refresh_token;
      if (at && rt) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ access_token: at, refresh_token: rt }),
        }).catch(() => {});
      }

      router.replace(next);
    } catch (e: any) {
      setError(e?.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Accedi</h1>

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          Continua con Google
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">oppure</span>
          </div>
        </div>

        <form onSubmit={signInWithEmail} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            Accedi
          </button>
        </form>
      </div>
    </main>
  );
}
