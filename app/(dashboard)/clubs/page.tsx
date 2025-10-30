// app/(dashboard)/clubs/page.tsx
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export default function Page() {
  // Questa route è disabilitata: niente elenco/creazione club da qui.
  notFound();
}
