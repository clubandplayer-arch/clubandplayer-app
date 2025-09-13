import { Suspense } from 'react';
import OpportunitiesClient from './OpportunitiesClient';

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-gray-500">
          Caricamento opportunità…
        </div>
      }
    >
      <OpportunitiesClient />
    </Suspense>
  );
}
