// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-neutral-500">
        La risorsa richiesta non esiste o è stata spostata.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Torna alla home
        </Link>
        <Link
          href="/opportunities"
          className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Vai alle opportunità
        </Link>
      </div>
    </main>
  );
}
