export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border bg-white p-6 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-lg font-semibold">Pagina non trovata</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          La risorsa che cerchi non esiste o è stata spostata.
        </p>
        <div className="mt-4">
          <a
            href="/feed"
            className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Vai al feed
          </a>
        </div>
      </div>
    </main>
  );
}
