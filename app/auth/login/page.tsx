'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAuth(url: string) {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); setErr(j.error || `HTTP ${res.status}`); }
        catch { setErr(txt || `HTTP ${res.status}`); }
        return;
      }
      // HARD REDIRECT: evitiamo ogni race sui cookie
      window.location.href = '/opportunities';
    } catch (e: any) {
      setErr(e?.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }

  function signIn()  { return handleAuth('/api/auth/signin'); }
  function signUp()  { return handleAuth('/api/auth/signup'); }

  function signInWithGoogle() {
    // questa route avvia l’OAuth e poi rientra su /auth/callback
    window.location.href = '/api/auth/oauth/google';
  }

  return (
    <main className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-white to-[#f6f8fb]">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-semibold mb-4">Accedi / Iscriviti</h1>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded-lg border ${tab==='login'?'bg-gray-900 text-white':'bg-white'}`}
            onClick={() => setTab('login')}
          >
            Accedi
          </button>
          <button
            className={`px-3 py-2 rounded-lg border ${tab==='signup'?'bg-gray-900 text-white':'bg-white'}`}
            onClick={() => setTab('signup')}
          >
            Registrati
          </button>
        </div>

        {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{err}</div>}

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-3 rounded-lg border px-3 py-2"
          placeholder="nome@esempio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full mb-4 rounded-lg border px-3 py-2"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full mb-3 rounded-xl bg-[#0A66C2] text-white py-2 font-medium disabled:opacity-60"
          onClick={tab === 'login' ? signIn : signUp}
          disabled={loading}
        >
          {tab === 'login' ? 'Accedi' : 'Crea account'}
        </button>

        <div className="text-center text-sm text-gray-500 my-2">oppure</div>

        <button
          className="w-full rounded-xl border py-2 font-medium hover:bg-gray-50"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          Accedi con Google
        </button>
      </div>
    </main>
  );
}
