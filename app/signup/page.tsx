import type { Metadata } from 'next';

import SignupClient from './SignupClient';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { resolveRequestLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export async function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(await resolveRequestLocale(), 'signup', '/signup');
}

export default function SignupPage() {
  return <SignupClient />;
}
