import type { Metadata } from 'next';
import LocalizedLegalDocument from '@/components/legal/LocalizedLegalDocument';

export const metadata: Metadata = {
  title: 'Termini di utilizzo • Club and Player',
  description: 'Termini di utilizzo di Club and Player.',
  alternates: { canonical: '/legal/terms' },
};

export default function Page() {
  return <LocalizedLegalDocument kind="terms" />;
}
