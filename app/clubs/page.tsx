// app/clubs/page.tsx
import { notFound } from 'next/navigation';

// Forziamo rendering server-side e niente cache,
// così notFound() produce HTTP 404 (non 200).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  notFound();
}
