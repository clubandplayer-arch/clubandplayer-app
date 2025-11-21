// app/(dashboard)/search-map/page.tsx
'use client';

import SearchMapClient from './SearchMapClient';

export default function SearchMapPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="heading-h1">Ricerca su mappa</h1>
        <p className="text-sm text-neutral-600">
          Esplora club e player direttamente sulla mappa: muovi l’area visibile per aggiornare i risultati nella lista laterale.
        </p>
      </div>
      <SearchMapClient />
    </div>
  );
}
