import type { Metadata } from 'next';
import BetaDocument from '@/components/legal/documents/BetaDocument';
import { legalCopy } from '@/lib/i18n/legal';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const copy = legalCopy[await resolveRequestLocale()].beta;
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/beta' } };
}

export default function Page() {
  return <BetaDocument />;
}
