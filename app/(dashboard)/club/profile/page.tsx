'use client';

import Link from 'next/link';

import ProfileEditForm from '@/components/profiles/ProfileEditForm';

export default function ProfilePage() {
  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Modifica dati club</h1>
      </header>

      <section className="glass-panel p-5 md:p-6">
        <h2 className="heading-h2 mb-2">Dati club</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Compila o aggiorna le informazioni principali del club, inclusi foto profilo, località e impianto.
        </p>
        <ProfileEditForm />
      </section>

      <section className="glass-panel border border-emerald-100 bg-emerald-50/60 p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Registro CONI
        </p>
        <h2 className="heading-h2 mt-1 mb-2">Rivendica la tua società</h2>
        <p className="mb-4 text-sm text-emerald-950">
          Cerca la tua ASD/SSD nel Registro CONI e collegala al profilo Club. Dopo l’approvazione admin, sul profilo pubblico apparirà il badge Registro CONI verificato.
        </p>
        <Link
          href="/club/registry-claim"
          className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Rivendica società Registro CONI
        </Link>
      </section>
    </main>
  );
}