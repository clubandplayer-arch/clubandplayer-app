import type { Metadata } from 'next';

import LoginClient from './LoginClient';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { resolveRequestLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export async function generateMetadata(): Promise<Metadata> {
  return { ...buildLocalizedMetadata(await resolveRequestLocale(), 'login', '/login'), robots: { index: false, follow: true } };
}

export default function LoginPage() {
  return <LoginClient />;
}
