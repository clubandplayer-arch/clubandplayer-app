'use client';

import AthleteHeader from '@/components/athlete/AthleteHeader';
import AthletePosts from '@/components/athlete/AthletePosts';

export default function AthletePublicPage({ params }: { params: { handle: string } }) {
  const handle = params.handle;

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-6 lg:col-span-8">
          <AthleteHeader handle={handle} />
          <AthletePosts handle={handle} />
        </section>

        <aside className="hidden xl:col-span-4 xl:block">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Informazioni
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Scheda tecnica, statistiche e link verranno aggiunti nelle prossime iterazioni.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
