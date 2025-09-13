import { Suspense } from 'react';
// Importa il client dalla cartella di lavoro esistente
// Se il file è in app/(dashboard)/opportunities/OpportunitiesClient.tsx, usa questo import:
import OpportunitiesClient from '@/app/(dashboard)/opportunities/OpportunitiesClient';
// Se invece avessi app/opportunities/OpportunitiesClient.tsx, usa:
// import OpportunitiesClient from './OpportunitiesClient';

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Caricamento opportunità…</div>}>
      <OpportunitiesClient />
    </Suspense>
  );
}
