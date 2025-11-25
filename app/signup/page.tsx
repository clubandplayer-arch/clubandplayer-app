// app/signup/page.tsx
'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

;

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import SocialLogin from '@/components/auth/SocialLogin';

type Role = 'athlete' | 'club';

const PlayerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-4 w-4"
    aria-hidden
  >
    <circle cx="7" cy="8" r="3" />
    <circle cx="17" cy="8" r="3" />
    <path d="M4 20v-1a4 4 0 0 1 4-4h0" />
    <path d="M20 20v-1a4 4 0 0 0-4-4h0" />
    <path d="M9.5 20v-1.5a2.5 2.5 0 0 1 5 0V20" />
  </svg>
);

const ClubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-4 w-4"
    aria-hidden
  >
    <path d="M4 21h16" />
    <path d="M6 21V9l6-4 6 4v12" />
    <path d="M9 21v-5h6v5" />
    <path d="M9 13h6" />
  </svg>
);

// env presenti?
const HAS_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
// domini su cui mostriamo il bottone (prod + local). I preview vercel passano cmq
const FIXED_ALLOWED = new Set(['https://clubandplayer-app.vercel.app', 'http://localhost:3000']);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) router.replace('/feed');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mostra il bottone Google solo quando ha senso
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const oauthReady = useMemo(() => {
    if (!HAS_ENV || !origin) return false;
    return FIXED_ALLOWED.has(origin) || hostname.endsWith('.vercel.app');
  }, [origin, hostname]);

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
          data: {
            ...(name ? { full_name: name } : {}),
            role,
          },
          emailRedirectTo,
        },
      });
      if (error) throw error;

      setOk('Registrazione avviata! Controlla la tua email per confermare l’account.');
      setTimeout(() => router.replace('/login'), 1500);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore durante la registrazione.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="grid items-start gap-10 md:grid-cols-12">
        {/* HERO TESTO - stile LinkedIn */}
        <section className="md:col-span-7">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Ti diamo il benvenuto nella più grande community sportiva.
          </h1>
          <br />
          <h2 className="text-1xl sm:text-2xl font-bold leading-tight">
            <em>entra a far parte di questo nuovo progetto!</em>
          </h2>
          <br />
          <p className="mt-4 lead max-w-2xl">
            Connettiti con club e player, pubblica opportunità, costruisci la tua carriera.
            Iscriviti in pochi secondi: scegli se sei un <b>Club</b> o un <b>Player</b>.
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

            {/* Google first */}
            {oauthReady && (
              <>
                <SocialLogin />
                <div className="my-3 flex items-center gap-3 text-xs text-gray-500">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span>oppure</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
              </>
            )}

            {/* Scelta ruolo spostata subito dopo il separatore */}
            <fieldset className="mb-4 rounded-lg border border-gray-200 px-3 py-2 dark:border-neutral-700">
              <legend className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Che tipo di account vuoi creare?
              </legend>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'athlete'}
                    onChange={() => setRole('athlete')}
                    className="accent-primary"
                  />
                  <PlayerIcon />
                  <span>Player</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'club'}
                    onChange={() => setRole('club')}
                    className="accent-primary"
                  />
                  <ClubIcon />
                  <span>Club</span>
                </label>
              </div>
            </fieldset>

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

              <button type="submit" disabled={busy} className="btn btn-brand w-full">
                {busy ? 'Registrazione…' : 'Registrati'}
              </button>
            </form>

            <p className="mt-6 text-center text-base font-semibold text-gray-700 dark:text-gray-200">
              Hai già un account?{' '}
              <a href="/login" className="link underline underline-offset-4">
                Accedi
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
