'use client';

import ClubProfileDetails from '@/components/profiles/ClubProfileDetails';
import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Profilo club</h1>
        <p className="text-sm text-neutral-600">
          Riepilogo dei dati del club con foto in testa e dettagli su posizione, categoria e impianto.
        </p>
      </header>

      <ClubProfileDetails />

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Modifica dati</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Aggiorna le informazioni del club; i cambiamenti si rifletteranno sul profilo pubblico e sul feed.
        </p>
        <ProfileEditForm />
      </section>
    </main>
  );
}
