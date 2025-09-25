'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Chi sono?
        const who = await fetch('/api/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        })
          .then((r) => r.json())
          .catch(() => ({}));

        const role = String(who?.role ?? '').toLowerCase();

        // I club NON fanno onboarding → profilo club
        if (role === 'club') {
          if (!cancelled) router.replace('/club/profile');
          return;
        }

        // 2) Se atleta ma profilo già presente → bacheca
        const me = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        })
          .then(async (r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const hasProfile = !!(me && (me.type || me.profile));
        if (hasProfile) {
          if (!cancelled) router.replace('/feed');
          return;
        }

        // 3) Atleta senza profilo → resta su onboarding
        if (!cancelled) setReady(true);
      } catch {
        // In caso di errore, non bloccare l’utente
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return <div className="p-6 text-sm text-gray-600">Reindirizzamento in corso…</div>;
  }

  // Qui va il contenuto vero dell’onboarding (form ecc.)
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <p className="text-gray-600">Completa il tuo profilo per iniziare.</p>
      {/* …il tuo form di onboarding… */}
    </div>
  );
}
