// app/(dashboard)/clubs/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ClubsClient from './ClubsClient';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Clubs — sola lettura',
  description: 'Elenco club con ricerca e paginazione (sola lettura).',
};

export default function Page() {
  const enabled = process.env.NEXT_PUBLIC_FEATURE_CLUBS_READONLY === '1';
  if (!enabled) notFound();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Clubs</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Vista in sola lettura con ricerca e paginazione.
      </p>
      <ClubsClient readOnly />
    </main>
  );
}
