'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FeedLatest from '@/components/feed/FeedLatest';

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
    <main className="container mx-auto px-4 py-6">
      {/* Griglia tipo LinkedIn: 3 colonne su lg (3/6/3), singola colonna su mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* SINISTRA */}
        <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:gap-6">
          {/* Mini profilo (placeholder, niente props obbligatorie) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm text-neutral-500 mb-2">Il tuo profilo</div>
            <div className="flex gap-3 items-center">
              <div className="h-10 w-10 rounded-full bg-neutral-200" />
              <div className="min-w-0">
                <div className="font-medium truncate">Benvenuto!</div>
                <Link
                  href={role === 'club' ? '/club/profile' : '/profile'}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Vai al profilo
                </Link>
              </div>
            </div>
          </div>

          {/* Azioni rapide per club */}
          {role === 'club' && (
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm text-neutral-500 mb-2">Azioni rapide</div>
              <div className="flex flex-col gap-2">
                <Link href="/opportunities/new" className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  + Pubblica opportunità
                </Link>
                <Link href="/club/applicants" className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  Vedi candidature
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* CENTRO */}
        <section className="lg:col-span-6 flex flex-col gap-6">
          {/* Composer semplificato (placeholder) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm text-neutral-500 mb-3">Condividi un aggiornamento</div>
            <textarea
              className="w-full rounded-xl border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              rows={3}
              placeholder="Scrivi qualcosa…"
            />
            <div className="mt-3 flex justify-end">
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" disabled>
                Pubblica (coming soon)
              </button>
            </div>
          </div>

          {/* 🔴 DATI REALI: Ultime opportunità */}
          <FeedLatest />

          {/* Post di un club (placeholder) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="font-medium">Post di un club</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              Foto allenamento prima squadra…
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" disabled>
                Mi piace
              </button>
              <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800" disabled>
                Commenta
              </button>
            </div>
          </div>
        </section>

        {/* DESTRA */}
        <aside className="hidden xl:col-span-3 xl:flex xl:flex-col xl:gap-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">🔥 Trending</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/search/athletes?trend=mercato" className="text-blue-600 hover:underline dark:text-blue-400">Calciomercato Dilettanti</a></li>
              <li><a href="/opportunities?role=goalkeeper&gender=f" className="text-blue-600 hover:underline dark:text-blue-400">Portieri femminili U21</a></li>
              <li><a href="/feed?tag=preparazione" className="text-blue-600 hover:underline dark:text-blue-400">Preparazione invernale</a></li>
              <li><a href="/opportunities?league=serie-d&role=winger" className="text-blue-600 hover:underline dark:text-blue-400">Serie D – Esterni veloci</a></li>
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">👥 Chi seguire</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">ASD Siracusa</div>
                  <div className="truncate text-xs text-neutral-500">Eccellenza • Sicilia</div>
                </div>
                <a href="/c/asd-siracusa" className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  Vedi
                </a>
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">SSD Virtus Rosa</div>
                  <div className="truncate text-xs text-neutral-500">Femminile • Serie C</div>
                </div>
                <a href="/c/virtus-rosa" className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  Vedi
                </a>
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">Davide Bianchi</div>
                  <div className="truncate text-xs text-neutral-500">Punta centrale • 21 anni</div>
                </div>
                <a href="/u/davide-bianchi" className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  Vedi
                </a>
              </li>
            </ul>
            <div className="mt-4 text-right">
              <a href="/search/club" className="text-xs text-blue-600 hover:underline dark:text-blue-400">Mostra tutto</a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
