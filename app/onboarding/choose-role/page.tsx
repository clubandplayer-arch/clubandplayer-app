'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MaterialIcon, type MaterialIconName } from '@/components/icons/MaterialIcon';

type Role = 'club' | 'athlete' | 'fan';

export default function ChooseRolePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = sp.get('next');

  async function choose(role: Role) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account_type: role }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Salvataggio non riuscito');
      }
      if (role === 'club') {
        router.replace('/club/profile');
        return;
      }
      if (role === 'athlete') {
        router.replace('/player/profile');
        return;
      }
      router.replace(next || '/feed');
    } catch (e: any) {
      setError(e?.message || 'Errore imprevisto');
      setSaving(false);
    }
  }

  const roleCards: Array<{
    role: Role;
    title: string;
    description: string;
    icon: MaterialIconName;
  }> = [
    {
      role: 'club',
      title: 'CLUB',
      description: 'Gestisci il tuo club, pubblica contenuti e crea opportunità',
      icon: 'opportunities',
    },
    {
      role: 'athlete',
      title: 'PLAYER',
      description: 'Vivi il tuo sport, crea il tuo profilo e trova opportunità',
      icon: 'person',
    },
    {
      role: 'fan',
      title: 'FAN',
      description: 'Segui, vivi e sostieni Club e Player, dentro e fuori dal campo',
      icon: 'following',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[#0b5477] md:text-5xl">
          Scegli come vuoi usare Club &amp; Player
        </h1>
        <p className="mt-4 text-2xl text-neutral-600">Ogni ruolo offre un&apos;esperienza diversa</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
        {roleCards.map(({ role, title, description, icon }) => {
          const active = selectedRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              disabled={saving}
              className={`rounded-3xl border bg-white p-7 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5477]/40 ${
                active ? 'border-[#6da9c2] ring-2 ring-[#6da9c2]/40' : 'border-neutral-200 hover:border-[#b9d5e1]'
              }`}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f1f6] text-[#1a7aa6]">
                <MaterialIcon name={icon} fontSize={22} />
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-[#0f172a]">{title}</h2>
              <p className="mt-3 text-3xl leading-10 text-neutral-600">{description}</p>
            </button>
          );
        })}
      </div>

      {error && <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={!selectedRole || saving}
          onClick={() => selectedRole && choose(selectedRole)}
          className="min-w-[220px] rounded-2xl bg-[#7db0c5] px-8 py-4 text-2xl font-semibold text-white transition hover:bg-[#6ca4bb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Continua'}
        </button>
      </div>
    </main>
  );
}
