// app/(dashboard)/search-map/page.tsx
'use client';

import SearchMapClient from './SearchMapClient';

export default function SearchMapPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="heading-h1">Ricerca su mappa</h1>
        <p className="text-sm text-neutral-600">
          Disegna la tua area di ricerca, applica i filtri e scopri club o player solo nella zona che ti interessa.
        </p>
      </div>
      <SearchMapClient />
    </div>
  );
}
