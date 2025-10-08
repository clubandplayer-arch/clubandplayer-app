'use client';
import * as Sentry from '@sentry/nextjs';

export default function ClientErrorPage() {
  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-lg font-semibold mb-4">Client error test</h1>
      <button
        className="rounded-md border px-3 py-2"
        onClick={() => {
          const err = new Error('Manual client error');
          Sentry.captureException(err);
          throw err;
        }}
      >
        Throw client error
      </button>
    </main>
  );
}
