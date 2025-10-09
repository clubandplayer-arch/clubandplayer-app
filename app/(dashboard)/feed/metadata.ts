// app/(dashboard)/feed/metadata.ts
import type { Metadata } from 'next';

const title = 'Bacheca — Club & Player';
const description =
  'La bacheca della community: aggiornamenti, post dai club e dagli atleti.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/feed' },
  openGraph: {
    url: '/feed',
    title,
    description,
    type: 'website',
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
  },
};
