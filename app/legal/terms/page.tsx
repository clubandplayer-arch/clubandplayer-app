import type { Metadata } from 'next';
import TermsDocument from '@/components/legal/documents/TermsDocument';
import { legalCopy } from '@/lib/i18n/legal';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const copy = legalCopy[await resolveRequestLocale()].terms;
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/terms' } };
}

export default function Page() {
  return <TermsDocument />;
}
