'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Role = 'club' | 'athlete' | 'fan';

export default function ChooseRolePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [saving, setSaving] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = sp.get('next');

  async function choose(role: Role) {
    setSaving(role);
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
      setSaving(null);
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Scegli il tuo ruolo</h1>
      <p className="mb-8 text-neutral-600">
        Per personalizzare l’esperienza, indica se stai usando Club&Player come <strong>Club</strong>, <strong>Player</strong> o <strong>Fan</strong>.
        Potrai cambiarlo in seguito dalle impostazioni.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card Club */}
        <button
          className="group rounded-2xl border p-5 text-left transition hover:shadow-md focus:outline-none focus:ring-2"
          onClick={() => choose('club')}
          disabled={!!saving}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sono un Club</h2>
            <span className="rounded-full border px-3 py-1 text-xs">Seleziona</span>
          </div>
          <p className="text-sm text-neutral-600">
            Pubblica opportunità, ricevi candidature, scopri e contatta atleti.
          </p>
          <div className="mt-4 text-sm text-blue-700">
            {saving === 'club' ? 'Salvataggio…' : 'Continua come Club'}
          </div>
        </button>

        {/* Card Player */}
        <button
          className="group rounded-2xl border p-5 text-left transition hover:shadow-md focus:outline-none focus:ring-2"
          onClick={() => choose('athlete')}
          disabled={!!saving}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sono un Player</h2>
            <span className="rounded-full border px-3 py-1 text-xs">Seleziona</span>
          </div>
          <p className="text-sm text-neutral-600">
            Crea il profilo sportivo, trova opportunità e candidati direttamente.
          </p>
          <div className="mt-4 text-sm text-blue-700">
            {saving === 'athlete' ? 'Salvataggio…' : 'Continua come Player'}
          </div>
        </button>

        {/* Card Fan */}
        <button
          className="group rounded-2xl border p-5 text-left transition hover:shadow-md focus:outline-none focus:ring-2"
          onClick={() => choose('fan')}
          disabled={!!saving}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sono un Fan</h2>
            <span className="rounded-full border px-3 py-1 text-xs">Seleziona</span>
          </div>
          <p className="text-sm text-neutral-600">
            Segui, vivi e sostieni Club e Player, dentro e fuori dal campo.
          </p>
          <div className="mt-4 text-sm text-blue-700">
            {saving === 'fan' ? 'Salvataggio…' : 'Continua come Fan'}
          </div>
        </button>
      </div>

      {error && <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-8 text-sm text-neutral-600">
        Hai un dubbio? Puoi cambiare ruolo più avanti dalla pagina <strong>Impostazioni</strong>.
      </div>
    </main>
  );
}
