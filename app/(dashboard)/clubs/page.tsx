// app/(dashboard)/clubs/page.tsx
'use client';

import FilterBar from '@/components/filters/FilterBar';
import SavedViewsBar from '@/components/views/SavedViewsBar';

export default function ClubsPage() {
  return (
    <main className="min-h-screen">
      {/* Barra con le viste salvate, richiede la prop scope */}
      <SavedViewsBar scope="clubs" />

      {/* FilterBar richiede la prop scope */}
      <FilterBar scope="clubs" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Qui il contenuto della pagina Clubs */}
        <h1 className="text-2xl font-semibold mb-4">Clubs</h1>
        {/* TODO: lista/ griglia club */}
      </div>
    </main>
  );
}
