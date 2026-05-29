import type { Metadata } from 'next';

import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export const metadata: Metadata = {
  title: 'Login Club & Player',
  description: 'Accedi al tuo account Club & Player.',
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
