import type { Metadata } from 'next';
import PrivacyDocument from '@/components/legal/documents/PrivacyDocument';
import { legalCopy } from '@/lib/i18n/legal';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const copy = legalCopy[await resolveRequestLocale()].privacy;
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/privacy' } };
}

export default function Page() {
  return <PrivacyDocument />;
}
