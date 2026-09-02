import ClubMapClient from './ClubMapClient';
import { buildLocalizedMetadata } from '@/lib/i18n/metadata';
import { resolveRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata() {
  return buildLocalizedMetadata(await resolveRequestLocale(), 'clubMap', '/club-map');
}

export default function ClubMapPage() {
  return (
    <main className="container mx-auto max-w-6xl px-3 py-6 md:px-4">
      <ClubMapClient />
    </main>
  );
}
