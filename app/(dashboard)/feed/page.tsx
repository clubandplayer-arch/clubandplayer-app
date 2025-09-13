'use client';

import ProfileMiniCard from '@/components/profiles/ProfileMiniCard';
import FeedOpportunities from '@/components/feed/FeedOpportunities';

export default function FeedPage() {
  const interests = ['Calcio', 'Siracusa', 'Juniores', 'Attaccante'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Left column */}
      <aside className="md:col-span-3 space-y-4">
        <ProfileMiniCard
          name="Gabriele Basso"
          location="Carlentini (SR)"
          role="Attaccante"
          heightCm={182}
          weightKg={78}
          foot="Destro"
          valueEUR={12500}
        />
        <section className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold mb-2">Interessi</div>
          <div className="flex flex-wrap gap-2">
            {interests.map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {t}
              </span>
            ))}
          </div>
        </section>
      </aside>

      {/* Center column: feed vero */}
      <section className="md:col-span-6 space-y-4">
        {/* Composer placeholder */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <input
              className="flex-1 rounded-lg border px-3 py-2"
              placeholder="Condividi un aggiornamento o pubblica un'opportunità"
            />
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <button className="rounded-lg border px-2 py-1">Post</button>
            <button className="rounded-lg border px-2 py-1">Opportunità</button>
          </div>
        </div>

        <FeedOpportunities />
      </section>

      {/* Right column */}
      <aside className="md:col-span-3 space-y-4">
        <section className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold mb-3">Club suggeriti</div>
          <ul className="space-y-3 text-sm">
            {['SSD Siracusa Calcio', 'ASD Lentini', 'ASD Sportland'].map((c) => (
              <li key={c} className="flex items-center justify-between">
                <span>{c}</span>
                <button className="rounded-lg border px-2 py-1 text-xs">Segui</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl border p-4">
          <div className="text-sm font-semibold mb-3">Opportunità per te</div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span>Portiere U17 • Carlentini</span>
              <button className="rounded-lg border px-2 py-1 text-xs">Vedi</button>
            </li>
            <li className="flex items-center justify-between">
              <span>Centrocampista • Siracusa</span>
              <button className="rounded-lg border px-2 py-1 text-xs">Vedi</button>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
