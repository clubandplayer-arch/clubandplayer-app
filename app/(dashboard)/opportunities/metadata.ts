// app/(dashboard)/opportunities/metadata.ts
import type { Metadata } from 'next';

const title = 'Opportunità — Club & Player';
const description =
  'Cerca e pubblica provini, ingaggi e proposte per club e atleti.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/opportunities' },
  openGraph: {
    url: '/opportunities',
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
