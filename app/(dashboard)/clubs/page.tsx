// app/(dashboard)/clubs/page.tsx
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export default function Page() {
  // Questa rotta non esiste più.
  notFound();
}
