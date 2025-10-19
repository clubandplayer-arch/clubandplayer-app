'use client';

import { useRouter } from 'next/navigation';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import useIsClub from '@/hooks/useIsClub';

export default function NewOpportunityPage() {
  const router = useRouter();
  const { isClub, loading } = useIsClub();

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Verifica permessi…</div>;
  }

  if (!isClub) {
    return (
      <div className="max-w-2xl mx-auto rounded-xl border p-4 bg-yellow-50 text-yellow-900">
        Devi essere un <b>Club</b> per creare un’opportunità.
        <div className="mt-2">
          <a href="/profile" className="underline">Apri il profilo</a> e imposta il tipo account su <b>Club</b>.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Nuova opportunità</h1>
      <OpportunityForm
        onCancel={() => router.push('/opportunities')}
        onSaved={() => router.push('/opportunities')}
      />
    </div>
  );
}
