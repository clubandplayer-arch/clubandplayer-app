import type { Metadata } from 'next';

import SignupClient from './SignupClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

const title = 'Registrati a Club & Player: network sportivo per club, player, staff e fan';
const description =
  'Crea un account Club & Player per pubblicare opportunità sportive, candidarti, costruire un profilo sportivo e seguire club o player.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/signup',
  },
  openGraph: {
    title,
    description,
    url: '/signup',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function SignupPage() {
  return <SignupClient />;
}
