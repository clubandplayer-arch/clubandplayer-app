'use client';

export default function ClientErrorPage() {
  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-lg font-semibold mb-4">Client error test</h1>
      <button
        className="rounded-md border px-3 py-2"
        onClick={() => {
          // Sentry lo intercetta come errore non gestito sul client
          throw new Error('Client error test: manual throw');
        }}
      >
        Throw client error
      </button>
    </main>
  );
}
