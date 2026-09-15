import type { Metadata } from 'next';
import LocalizedLegalDocument from '@/components/legal/LocalizedLegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy • Club and Player',
  description: 'Informativa privacy di Club and Player.',
  alternates: { canonical: '/legal/privacy' },
};

export default function Page() {
  return <LocalizedLegalDocument kind="privacy" />;
}
