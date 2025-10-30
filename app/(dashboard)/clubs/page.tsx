import type { Metadata } from 'next';
import ClubsClient from './ClubsClient';

export const metadata: Metadata = {
  title: 'Clubs — Club&Player',
  description: 'Gestisci e cerca i club: tabella, ricerca, paginazione e moduli di creazione/modifica.',
};

export default function Page() {
  return (
    <div className="p-4 md:p-6">
      <ClubsClient />
    </div>
  );
}
