'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Se già loggato, esci subito dalla pagina di login
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(me => {
        if (!cancelled && me?.id) {
          router.replace('/opportunities');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/${mode === 'signin' ? 'signin' : 'signup'}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const raw = await res.text();
      let json: any;
      try { json = JSON.parse(raw); } catch { json = { raw }; }

      if (!res.ok) {
        setErr(json?.error || `HTTP ${res.status}`);
        setSubmitting(false);
        return;
      }

      // Verifica che la sessione sia effettivamente attiva e poi redirect
      const me = await fetch('/api/auth/whoami', {
        credentials: 'include',
        cache: 'no-store',
      }).then(r => r.json()).catch(() => null);

      if (me?.id) {
        router.replace('/opportunities');
      } else {
        setErr('Login riuscito, ma sessione non trovata. Riprova.');
        setSubmitting(false);
      }
    } catch (e: any) {
      setErr(e?.message || 'Errore imprevisto');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[80vh] grid place-items-center bg-gradient-to-b from-white to-[#f6f8fb]">
      <div className="w-full max-w-md bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Accedi / Iscriviti</h1>
        <p className="text-sm text-gray-600 mb-6">Inserisci le credenziali per accedere</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`px-3 py-2 rounded-lg border ${mode === 'signin' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-3 py-2 rounded-lg border ${mode === 'signup' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="nome@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              required
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="•••••••"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </label>

          {err && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl p-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-2 bg-brand text-white font-medium disabled:opacity-60"
          >
            {submitting
              ? (mode === 'signin' ? 'Accesso in corso…' : 'Registrazione in corso…')
              : (mode === 'signin' ? 'Accedi' : 'Registrati')}
          </button>
        </form>

        {/* eventuale pulsante Google, quando pronto */}
        {/* <div className="mt-4 text-center">
          <a href="/auth/oauth/google" className="text-sm underline">Accedi con Google</a>
        </div> */}
      </div>
    </main>
  );
}
