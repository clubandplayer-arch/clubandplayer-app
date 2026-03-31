'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import RoleCard from '@/components/onboarding/RoleCard';

type ApiRole = 'club' | 'athlete' | 'fan';
type SelectedRole = ApiRole | null;

const ROLE_TARGET: Record<ApiRole, string> = {
  club: '/club/profile',
  athlete: '/player/profile',
  fan: '/feed',
};

export default function ChooseRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [saving, setSaving] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!active) return;

        if (!json?.user?.id) {
          router.replace('/login?next=%2Fonboarding%2Fchoose-role');
          return;
        }

        if (json?.profile?.account_type) {
          router.replace('/feed');
          return;
        }

        setCheckingAccess(false);
      } catch {
        if (!active) return;
        router.replace('/login?next=%2Fonboarding%2Fchoose-role');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleContinue() {
    if (!selectedRole || saving) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account_type: selectedRole }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Salvataggio ruolo non riuscito.');
      }

      router.replace(ROLE_TARGET[selectedRole]);
    } catch (err: any) {
      setError(err?.message ?? 'Errore imprevisto durante il salvataggio del ruolo.');
      setSaving(false);
    }
  }

  if (checkingAccess) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-4">
        <p className="text-sm text-slate-600">Verifica account in corso…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center px-4 py-10">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Scegli come vuoi usare Club &amp; Player
        </h1>
        <p className="mt-3 text-base text-slate-600">Ogni ruolo offre un’esperienza diversa</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 md:gap-6" aria-label="Selezione ruolo utente">
        <RoleCard
          title="CLUB"
          description="Gestisci il tuo club, pubblica contenuti e crea opportunità"
          icon={<MaterialIcon name="opportunities" fontSize={22} />}
          selected={selectedRole === 'club'}
          onClick={() => setSelectedRole('club')}
        />
        <RoleCard
          title="PLAYER"
          description="Vivi il tuo sport, crea il tuo profilo e trova opportunità"
          icon={<MaterialIcon name="person" fontSize={22} />}
          selected={selectedRole === 'athlete'}
          onClick={() => setSelectedRole('athlete')}
        />
        <RoleCard
          title="FAN"
          description="Segui, vivi e sostieni Club e Player, dentro e fuori dal campo"
          icon={<MaterialIcon name="following" fontSize={22} />}
          selected={selectedRole === 'fan'}
          onClick={() => setSelectedRole('fan')}
        />
      </section>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedRole || saving}
          className="inline-flex h-11 min-w-40 items-center justify-center rounded-xl bg-[#036f9a] px-6 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Continua'}
        </button>
      </div>

      {error ? (
        <p className="mx-auto mt-4 w-full max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </main>
  );
}
