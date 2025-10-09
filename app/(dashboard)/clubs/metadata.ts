// app/(dashboard)/clubs/metadata.ts
import type { Metadata } from 'next';

const title = 'Club — Club & Player';
const description =
  'Scopri i club registrati e trova quello giusto per la tua carriera.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/clubs' },
  openGraph: {
    url: '/clubs',
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
