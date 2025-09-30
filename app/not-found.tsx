// app/not-found.tsx
export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-neutral-500">
        La risorsa richiesta non esiste oppure è stata spostata.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-md border px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Torna alla Home
      </a>
    </main>
  );
}
