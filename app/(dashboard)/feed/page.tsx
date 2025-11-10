// app/(dashboard)/feed/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FeedLatest from '@/components/feed/FeedLatest';
import WhoToFollow from '@/components/feed/WhoToFollow';
import FeedPosts from '@/components/feed/FeedPosts';
import ProfileMiniCard from '@/components/profiles/ProfileMiniCard';

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
      {/* h1 “nascosto” per SEO/accessibilità senza cambiare il layout */}
      <h1 className="sr-only">Bacheca</h1>

      {/* Griglia tipo LinkedIn: 3 colonne su lg (3/6/3), singola colonna su mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* SINISTRA */}
        <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:gap-6">
          {/* Mini profilo (sostituisce “Benvenuto! / Vai al profilo”) */}
          <div className="card p-4">
            <div className="mb-2 text-sm text-neutral-500">Il tuo profilo</div>
            <ProfileMiniCard />
          </div>

          {/* Azioni rapide per club */}
          {role === 'club' && (
            <div className="card p-4">
              <div className="mb-2 text-sm text-neutral-500">Azioni rapide</div>
              <div className="flex flex-col gap-2">
                <Link href="/opportunities/new" className="btn btn-outline">
                  + Pubblica opportunità
                </Link>
                <Link href="/club/applicants" className="btn btn-outline">
                  Vedi candidature
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* CENTRO */}
        <section className="lg:col-span-6 flex flex-col gap-6">
          {/* Composer (placeholder per ora) */}
          <div className="card p-4">
            <div className="mb-3 text-sm text-neutral-500">Condividi un aggiornamento</div>
            <textarea className="textarea" rows={3} placeholder="Scrivi qualcosa…" />
            <div className="mt-3 flex justify-end">
              <button className="btn btn-outline text-sm" disabled>
                Pubblica (coming soon)
              </button>
            </div>
          </div>

          {/* 🔴 DATI REALI: Ultime opportunità */}
          <FeedLatest />

          {/* 🔴 DATI REALI: Post dal DB */}
          <div className="card p-4">
            <div className="mb-3 text-sm font-medium">Aggiornamenti della community</div>
            <FeedPosts />
          </div>
        </section>

        {/* DESTRA */}
        <aside className="hidden xl:col-span-3 xl:flex xl:flex-col xl:gap-6">
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">🔥 Trending</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search/athletes?trend=mercato" className="link">
                  Calciomercato Dilettanti
                </Link>
              </li>
              <li>
                <Link href="/opportunities?role=goalkeeper&gender=f" className="link">
                  Portieri femminili U21
                </Link>
              </li>
              <li>
                <Link href="/feed?tag=preparazione" className="link">
                  Preparazione invernale
                </Link>
              </li>
              <li>
                <Link href="/opportunities?league=serie-d&role=winger" className="link">
                  Serie D – Esterni veloci
                </Link>
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
