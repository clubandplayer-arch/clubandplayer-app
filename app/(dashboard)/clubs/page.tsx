// app/(dashboard)/clubs/page.tsx
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

/**
 * Rotta disabilitata per policy di prodotto.
 * Mostra 404 (Next.js notFound) e lascia all’utente l’azione di tornare in home.
 */
export default function Page() {
  notFound();
}
