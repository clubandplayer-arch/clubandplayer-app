import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export default function Page() {
  // Route disabilitata: /clubs non è accessibile
  notFound();
}
