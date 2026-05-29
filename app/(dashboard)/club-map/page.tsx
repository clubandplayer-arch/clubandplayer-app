import ClubMapClient from './ClubMapClient';

export const metadata = {
  title: 'Mappa Club',
};

export default function ClubMapPage() {
  return (
    <main className="container mx-auto max-w-6xl px-3 py-6 md:px-4">
      <ClubMapClient />
    </main>
  );
}
