import type { Metadata } from 'next';
import LocalizedLegalDocument from '@/components/legal/LocalizedLegalDocument';

export const metadata: Metadata = {
  title: 'Informativa programma Beta • Club and Player',
  description: 'Informativa del programma Beta Club and Player.',
  alternates: { canonical: '/legal/beta' },
};

export default function Page() {
  return <LocalizedLegalDocument kind="beta" />;
}
