import type { Metadata } from 'next';
import B4ProfileResidencePreview from './B4ProfileResidencePreview';

export const metadata: Metadata = {
  title: 'QA B4.4 — Canonical profile residence',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <B4ProfileResidencePreview />;
}
