// app/signup/page.tsx
'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

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

  // se già loggato → onboarding se manca ruolo, altrimenti feed
  useEffect(() => {
    (async () => {
      const who = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
      const json = await who.json().catch(() => ({}));
      if (!json?.user?.id) return;
      if (!json?.profile?.account_type) {
        router.replace('/onboarding/choose-role');
        return;
      }
      router.replace('/feed');
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
              Ti diamo il benvenuto nella più grande community sportiva.
            </h2>
            <h3 className="text-xl font-bold leading-tight text-[#0b6c9c] sm:text-2xl">
              <em>entra a far parte di questo nuovo progetto!</em>
            </h3>
            <p className="text-lg leading-relaxed text-slate-800">
              Connettiti con la community, scopri contenuti e costruisci il tuo percorso sportivo.
              Iscriviti in pochi secondi e completa il tuo onboarding al primo accesso.
            </p>
            <ul className="mt-4 space-y-3 text-base text-slate-800">
              <li>• Segui contenuti e aggiornamenti della community</li>
              <li>• Completa il tuo <b>profilo</b> in pochi passaggi</li>
              <li>• Accedi a feed, chat e funzionalità in app</li>
            </ul>
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
