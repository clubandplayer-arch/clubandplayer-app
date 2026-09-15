import type { Metadata } from 'next';
import LocalizedLegalDocument from '@/components/legal/LocalizedLegalDocument';

export const metadata: Metadata = {
  title: 'Standard di sicurezza dei minori • Club and Player',
  description: 'Standard di sicurezza dei minori di Club and Player.',
  alternates: { canonical: '/legal/child-safety' },
};

export default function Page() {
  return <LocalizedLegalDocument kind="childSafety" />;
}
