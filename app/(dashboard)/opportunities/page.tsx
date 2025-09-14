import { Suspense } from 'react';
import OpportunitiesClient from './OpportunitiesClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Caricamento…</div>}>
      <OpportunitiesClient />
    </Suspense>
  );
}
