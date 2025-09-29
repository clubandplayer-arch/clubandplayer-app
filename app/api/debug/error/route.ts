// app/api/debug/error/route.ts
export const runtime = 'nodejs'; // usa la lambda Node/Vercel

import * as Sentry from '@sentry/nextjs';

export async function GET() {
  // manda l’evento a Sentry e poi genera un 500 volontario
  const err = new Error('Sentry test error (server)');
  Sentry.captureException(err);
  throw err; // Next restituirà 500 e Sentry lo registrerà comunque
}
