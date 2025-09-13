'use client';

import ProfileMiniCard from '@/components/profiles/ProfileMiniCard';
import FeedOpportunities from '@/components/feed/FeedOpportunities';
import InterestsPanel, { type Interests } from '@/components/profiles/InterestsPanel';
import FeedComposer from '@/components/feed/FeedComposer';

export default function FeedPage() {
  // stato solo per forzare refresh del feed quando salvo gli interessi
  let interestsRef: Interests | undefined;

  function handleInterestsChange(next: Interests) {
    // FeedOpportunities rilegge dal localStorage; qui possiamo lasciare solo il "tap" se serve
    interestsRef = next;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 md:p-6">
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
        <InterestsPanel onChange={handleInterestsChange} />
      </aside>

      {/* Center column: feed */}
      <section className="md:col-span-6 space-y-4">
        <FeedComposer />
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
