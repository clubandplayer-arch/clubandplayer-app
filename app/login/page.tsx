'use client';

import { useState } from 'react';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // usato solo in signup
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function postJSON(url: string, payload: any) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    const json = txt ? JSON.parse(txt) : {};
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }

  async function handleSignin() {
    setErr(null);
    setLoading(true);
    try {
      await postJSON('/api/auth/signin', { email, password });
      // opzionale: controlla profilo per decidere redirect
      const meProf = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
      if (meProf?.data?.type) {
        window.location.href = '/opportunities';
      } else {
        window.location.href = '/onboarding';
      }
    } catch (e: any) {
      setErr(e.message || 'Errore durante l’accesso');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupThenSignin() {
    setErr(null);
    setLoading(true);
    try {
      await postJSON('/api/auth/signup', { email, password, username });
      // sign-in automatico
      await postJSON('/api/auth/signin', { email, password });

      // redirect
      const meProf = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
      if (meProf?.data?.type) {
        window.location.href = '/opportunities';
      } else {
        window.location.href = '/onboarding';
      }
    } catch (e: any) {
      setErr(e.message || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === 'signin') handleSignin();
    else handleSignupThenSignin();
  }

  return (
    <main className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-white to-[#f6f8fb] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-1">Accedi / Iscriviti</h1>
          <p className="text-gray-600 mb-6">
            {mode === 'signin'
              ? 'Inserisci le credenziali per accedere'
              : 'Crea un nuovo account per iniziare'}
          </p>

          {/* Switch mode */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('signin')}
              className={`px-3 py-1 rounded-lg border ${mode === 'signin' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              Accedi
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`px-3 py-1 rounded-lg border ${mode === 'signup' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm mb-1">Username (opzionale)</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="es. mario.rossi"
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="nome@esempio.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl px-4 py-2 bg-[#0a66c2] text-white font-medium hover:opacity-95 disabled:opacity-60"
            >
              {loading ? 'Attendere…' : (mode === 'signin' ? 'Accedi' : 'Crea account')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-3 text-gray-400 text-xs">oppure</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* OAuth (Google pronto quando config ok) */}
          <a
            href="/auth/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 border hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 512 512" aria-hidden="true"><path fill="#EA4335" d="M256 8c68 0 130 26 177 69l-72 69c-29-28-67-45-105-45-84 0-153 69-153 153s69 153 153 153c76 0 124-43 138-103H256v-90h256v45c0 141-115 256-256 256S0 397 0 256 115 0 256 0z"/></svg>
            Accedi con Google
          </a>
        </div>
      </div>
    </main>
  );
}
