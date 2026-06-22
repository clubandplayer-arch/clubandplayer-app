import type { Metadata } from 'next';

import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export const metadata: Metadata = {
  title: 'Login Club and Player',
  description: 'Accedi al tuo account Club and Player.',
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
