'use client';

import ClubHeader from '@/components/club/ClubHeader';
import ClubOpportunitiesList from '@/components/club/ClubOpportunitiesList';

export default function ClubPublicPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Contenuto principale */}
        <section className="flex flex-col gap-6 lg:col-span-8">
          <ClubHeader slug={slug} />
          <ClubOpportunitiesList slug={slug} />
        </section>

        {/* Sidebar destra (placeholder per info aggiuntive) */}
        <aside className="hidden xl:col-span-4 xl:block">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Informazioni
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Contatti, social, staff e altre sezioni verranno aggiunte in seguito.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
