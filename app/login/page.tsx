'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, payload: any) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'include', body: JSON.stringify(payload) });
      const t = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(t || `HTTP ${res.status}`); }
      }
      // Login riuscito → vai alla dashboard
      window.location.href = '/opportunities';
    } catch (e: any) {
      setError(e.message || 'Errore');
    } finally {
      setBusy(false);
    }
  }

  // forms state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const googleLogin = () => {
    // quando Google sarà ok, scommenta questa riga:
    window.location.href = '/auth/callback?provider=google';
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 bg-white">
        <h1 className="text-2xl font-semibold text-center mb-4">Accedi a Club&Player</h1>

        {/* OAuth (Google) – ora lo lasciamo ma è opzionale */}
        <button
          onClick={googleLogin}
          className="w-full border rounded-lg py-2 mb-4 hover:bg-gray-50 disabled:opacity-50"
          disabled
          title="Temporaneamente non disponibile"
        >
          Accedi con Google
        </button>

        {/* Tabs */}
        <div className="grid grid-cols-2 mb-4 rounded-lg overflow-hidden border">
          <button
            className={`py-2 ${tab === 'signin' ? 'bg-gray-900 text-white' : 'bg-white'}`}
            onClick={() => setTab('signin')}
          >
            Email & Password
          </button>
          <button
            className={`py-2 ${tab === 'signup' ? 'bg-gray-900 text-white' : 'bg-white'}`}
            onClick={() => setTab('signup')}
          >
            Registrati
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border rounded p-2">{error}</div>}

        {/* Forms */}
        <div className="space-y-3">
          {tab === 'signup' && (
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Username (facoltativo)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {tab === 'signin' ? (
            <button
              disabled={busy}
              onClick={() => post('/api/auth/signin', { email, password })}
              className="w-full rounded-lg py-2 bg-[#0a66c2] text-white hover:opacity-90 disabled:opacity-50"
            >
              Accedi
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => post('/api/auth/signup', { email, password, username })}
              className="w-full rounded-lg py-2 bg-[#C0392B] text-white hover:opacity-90 disabled:opacity-50"
            >
              Crea account
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Continuando accetti i nostri Termini e la Privacy Policy.
        </p>

        <p className="mt-2 text-center text-sm">
          Torna alla <Link className="text-[#0a66c2] hover:underline" href="/">home</Link>
        </p>
      </div>
    </div>
  );
}
