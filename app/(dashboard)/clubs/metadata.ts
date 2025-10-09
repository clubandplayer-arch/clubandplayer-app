// app/(dashboard)/clubs/metadata.ts
import type { Metadata } from 'next';

const title = 'Club — Club & Player';
const description = 'Scopri i club registrati e trova quello giusto per la tua carriera.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/clubs' },
  openGraph: {
    url: '/clubs',
    title,
    description,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Club & Player' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
};
