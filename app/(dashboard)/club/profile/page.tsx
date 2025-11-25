'use client';

import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Modifica dati club</h1>
        <p className="text-sm text-neutral-600">
          Aggiorna le informazioni del club; i cambiamenti si rifletteranno sul profilo pubblico e sul feed.
        </p>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Dati club</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Compila o aggiorna le informazioni principali del club, inclusi foto profilo, località e impianto.
        </p>
        <ProfileEditForm />
      </section>
    </main>
  );
}
