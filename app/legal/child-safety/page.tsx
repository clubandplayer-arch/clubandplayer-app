import type { Metadata } from 'next';
import ChildSafetyDocument from '@/components/legal/documents/ChildSafetyDocument';
import { legalCopy } from '@/lib/i18n/legal';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const copy = legalCopy[await resolveRequestLocale()].childSafety;
  return { title: copy.metaTitle, description: copy.metaDescription, alternates: { canonical: '/legal/child-safety' } };
}

export default function Page() {
  return <ChildSafetyDocument />;
}
