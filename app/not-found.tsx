import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/feed"
          className="rounded-xl border px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Torna al feed
        </Link>
        <Link
          href="/"
          className="rounded-xl border px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
