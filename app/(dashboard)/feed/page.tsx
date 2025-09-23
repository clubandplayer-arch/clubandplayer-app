'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FeedLatest from '@/components/feed/FeedLatest';
import WhoToFollow from '@/components/feed/WhoToFollow';
import Composer from '@/components/feed/Composer';
import FeedPosts from '@/components/feed/FeedPosts';

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
            <div className="mb-2 text-sm text-neutral-500">Il tuo profilo</div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-neutral-200" />
              <div className="min-w-0">
                <div className="truncate font-medium">Benvenuto!</div>
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
              <div className="mb-2 text-sm text-neutral-500">Azioni rapide</div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/opportunities/new"
                  className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Pubblica opportunità
                </Link>
                <Link
                  href="/club/applicants"
                  className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Vedi candidature
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* CENTRO */}
        <section className="lg:col-span-6 flex flex-col gap-6">
          {/* Composer attivo */}
          <Composer />

          {/* Post recenti (API stub) */}
          <FeedPosts />

          {/* 🔴 DATI REALI: Ultime opportunità */}
          <FeedLatest />
        </section>

        {/* DESTRA */}
        <aside className="hidden xl:col-span-3 xl:flex xl:flex-col xl:gap-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">🔥 Trending</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/search/athletes?trend=mercato" className="text-blue-600 hover:underline dark:text-blue-400">
                  Calciomercato Dilettanti
                </a>
              </li>
              <li>
                <a href="/opportunities?role=goalkeeper&gender=f" className="text-blue-600 hover:underline dark:text-blue-400">
                  Portieri femminili U21
                </a>
              </li>
              <li>
                <a href="/feed?tag=preparazione" className="text-blue-600 hover:underline dark:text-blue-400">
                  Preparazione invernale
                </a>
              </li>
              <li>
                <a href="/opportunities?league=serie-d&role=winger" className="text-blue-600 hover:underline dark:text-blue-400">
                  Serie D – Esterni veloci
                </a>
              </li>
            </ul>
          </div>

          {/* 👥 Suggerimenti dinamici */}
          <WhoToFollow />
        </aside>
      </div>
    </main>
  );
}
