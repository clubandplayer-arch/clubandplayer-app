// app/(dashboard)/opportunities/metadata.ts
import type { Metadata } from 'next';

const title = 'Opportunità — Club & Player';
const description = 'Cerca e pubblica provini, ingaggi e proposte per club e atleti.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/opportunities' },
  openGraph: {
    url: '/opportunities',
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
