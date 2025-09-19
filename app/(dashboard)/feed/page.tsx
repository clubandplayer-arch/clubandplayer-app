'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Role = 'club' | 'athlete' | 'guest';

export default function FeedPage() {
  const [role, setRole] = useState<Role>('guest');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'club' || raw === 'athlete' ? raw : 'guest');
      } catch {
        setRole('guest');
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Colonna sinistra */}
      <aside className="md:col-span-3 space-y-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500 mb-2">Il tuo profilo</div>
          <div className="flex gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div>
              <div className="font-medium">Benvenuto!</div>
              <Link
                href={role === 'club' ? '/club/profile' : '/profile'}
                className="text-sm text-blue-600 hover:underline"
              >
                Vai al profilo
              </Link>
            </div>
          </div>
        </div>

        {role === 'club' && (
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-2">Azioni rapide</div>
            <div className="flex flex-col gap-2">
              <Link href="/opportunities?new=1" className="rounded-md border px-3 py-2 hover:bg-gray-50">
                + Pubblica opportunità
              </Link>
              <Link href="/club/applicants" className="rounded-md border px-3 py-2 hover:bg-gray-50">
                Vedi candidature
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Colonna centrale */}
      <section className="md:col-span-6 space-y-4">
        {/* Composer semplificato */}
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500 mb-3">Condividi un aggiornamento</div>
          <textarea className="w-full rounded-xl border px-3 py-2" rows={3} placeholder="Scrivi qualcosa..." />
          <div className="mt-3 flex justify-end">
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" disabled>
              Pubblica (coming soon)
            </button>
          </div>
        </div>

        {/* Feed cards (placeholder) */}
        <div className="rounded-2xl border p-4">
          <div className="font-medium">Annuncio consigliato</div>
          <p className="text-sm text-gray-600 mt-1">Società XYZ cerca centrocampista U19..</p>
          <div className="mt-3 flex gap-2">
            <Link href="/opportunities" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Apri</Link>
            {role === 'athlete' && (
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" disabled>
                Candidati (dalla scheda)
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="font-medium">Post di un club</div>
          <p className="text-sm text-gray-600 mt-1">Foto allenamento prima squadra..</p>
          <div className="mt-3 flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" disabled>Mi piace</button>
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" disabled>Commenta</button>
          </div>
        </div>
      </section>

      {/* Colonna destra */}
      <aside className="md:col-span-3 space-y-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500 mb-2">Suggerimenti</div>
          <ul className="text-sm list-disc ml-5 space-y-1">
            <li>Completa la bio del profilo</li>
            <li>Carica il logo (club)</li>
            <li>Segui un club di tuo interesse</li>
          </ul>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500 mb-2">Statistiche (soon)</div>
          <div className="text-sm text-gray-600">0 visualizzazioni profilo</div>
          <div className="text-sm text-gray-600">0 interazioni questa settimana</div>
        </div>
      </aside>
    </div>
  );
}
