// app/signup/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Role = 'athlete' | 'club';

export default function SignupPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [role, setRole] = useState<Role>('athlete');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // se già loggato → vai alla feed
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace('/feed');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (pwd1.length < 8) return setErr('La password deve contenere almeno 8 caratteri.');
    if (pwd1 !== pwd2) return setErr('Le password non coincidono.');

    setBusy(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
      const emailRedirectTo = `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signUp({
        email,
        password: pwd1,
        options: {
          // salviamo anche il ruolo scelto
          data: {
            ...(name ? { full_name: name } : {}),
            role,
          },
          emailRedirectTo,
        },
      });
      if (error) throw error;

      setOk('Registrazione avviata! Controlla la tua email per confermare l’account.');
      // opzionale: dopo 1.5s porta alla login
      setTimeout(() => router.replace('/login'), 1500);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante la registrazione.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold">Crea un account</h1>

        {err && (
          <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</p>
        )}
        {ok && (
          <p className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">{ok}</p>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            Nome (facoltativo)
            <input
              type="text"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="block text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="block text-sm">
            Conferma password
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {/* Scelta ruolo */}
          <fieldset className="mt-2">
            <legend className="block text-sm font-medium mb-1">Che tipo di account vuoi creare?</legend>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'athlete'}
                  onChange={() => setRole('athlete')}
                />
                Atleta
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'club'}
                  onChange={() => setRole('club')}
                />
                Club
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Registrazione…' : 'Registrati'}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          Hai già un account? <a href="/login" className="underline">Accedi</a>
        </p>
      </div>
    </main>
  );
}
