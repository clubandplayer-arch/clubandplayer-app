// app/signup/page.tsx
'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

;

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import SocialLogin from '@/components/auth/SocialLogin';
import BrandLogo from '@/components/brand/BrandLogo';

// env presenti?
const HAS_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignupPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // se già loggato → lascia che sia il middleware a instradare:
  // - account_type mancante => /onboarding/choose-role
  // - account_type presente => /feed
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) router.replace('/');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mostra il bottone Google solo quando ha senso
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const oauthReady = useMemo(() => HAS_ENV && Boolean(origin), [origin]);

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
    <main className="min-h-screen bg-clubplayer-gradient">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-14 lg:px-10 lg:py-16">
        <section className="flex-1 space-y-6 text-left lg:max-w-2xl">
          <BrandLogo variant="signup" unlinked />
          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight text-[#00527a] sm:text-4xl">
              <em>entra a far parte di questo nuovo progetto!</em>
            </h2>
            <p className="text-lg leading-relaxed text-slate-800">
              Registrati come <b>CLUB</b> o come <b>PLAYER</b>, pubblica opportunità, costruisci la tua carriera.
              Iscriviti in pochi secondi.
            </p>
            <ul className="mt-4 space-y-3 text-base text-slate-800">
              <li>• Scopri e pubblica opportunità reali</li>
              <li>• Crea un profilo chiaro e aggiornato</li>
              <li>• Ricevi candidature e messaggi in app</li>
            </ul>
            <p className="text-lg leading-relaxed text-slate-800">
              Oppure registrati e connettiti come <b>FAN</b> e segui i tuoi Club o Player preferiti e interagisci con
              loro
            </p>
          </div>
        </section>

        {/* CARD FORM */}
        <section className="w-full max-w-lg flex-shrink-0">
          <div className="space-y-4 rounded-3xl border border-[#00527a1a] bg-white/90 p-8 shadow-xl backdrop-blur">
            <h2 className="sr-only">Crea un account</h2>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#00527a]">
              <span className="h-2 w-2 rounded-full bg-[#00527a]" aria-hidden />
              Accesso sicuro con email o Google
            </div>

            {/* Google first */}
            {oauthReady && (
              <div className="space-y-3">
                <SocialLogin label="Registrati con Google" />
                <SocialLogin label="Registrati con Apple" provider="apple" />
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span>oppure</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
              </div>
            )}

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
