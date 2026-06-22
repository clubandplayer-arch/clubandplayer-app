// app/(dashboard)/feed/metadata.ts
import type { Metadata } from 'next';

const title = 'Bacheca • Club and Player';
const description = 'Aggiornamenti dalla community.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/feed',
  },
  openGraph: {
    title,
    description,
    url: '/feed',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Club and Player' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
