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
    <main className="container mx-auto py-10">
      {/* barra sottile flag-like */}
      <div className="bg-gradient-to-r from-[var(--brand)] via-white to-[var(--accent)] h-1 rounded-full mb-8" />

      <div className="grid gap-10 md:grid-cols-12 items-start">
        {/* HERO TESTO - stile LinkedIn */}
        <section className="md:col-span-7">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Ti diamo il benvenuto nella tua community calcistica
          </h1>
          <p className="mt-4 lead max-w-2xl">
            Connettiti con club e atleti, pubblica opportunità, costruisci la tua carriera.
            Iscriviti in pochi secondi: scegli se sei un <b>Club</b> o un <b>Atleta</b>.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li>• Scopri e pubblica <b>opportunità</b> reali</li>
            <li>• Crea un <b>profilo</b> chiaro e aggiornato</li>
            <li>• Ricevi <b>candidature</b> e messaggi in app</li>
          </ul>
        </section>

        {/* CARD FORM */}
        <section className="md:col-span-5">
          <div className="card p-6 space-y-4">
            <h2 className="sr-only">Crea un account</h2>

            {err && (
              <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
                {err}
              </p>
            )}
            {ok && (
              <p className="rounded-md border border-green-300 bg-green-50 p-2 text-sm text-green-700">
                {ok}
              </p>
            )}

            <form onSubmit={onSubmit} className="space-y-3">
              <label className="label">
                Nome (facoltativo)
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>

              <label className="label">
                Email
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              <label className="label">
                Password
                <input
                  type="password"
                  className="input"
                  value={pwd1}
                  onChange={(e) => setPwd1(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              <label className="label">
                Conferma password
                <input
                  type="password"
                  className="input"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              {/* Scelta ruolo */}
              <fieldset className="mt-2">
                <legend className="label mb-1">Che tipo di account vuoi creare?</legend>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'athlete'}
                      onChange={() => setRole('athlete')}
                    />
                    Atleta
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700">
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

              <button type="submit" disabled={busy} className="btn btn-brand w-full">
                {busy ? 'Registrazione…' : 'Registrati'}
              </button>
            </form>

            <p className="text-xs text-gray-500">
              Hai già un account? <a href="/login" className="link">Accedi</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
