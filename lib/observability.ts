// lib/observability.ts
import * as Sentry from '@sentry/nextjs';

export function reportError(err: unknown, extra?: Record<string, unknown>) {
  try {
    Sentry.captureException(err, extra ? { extra } : undefined);
  } catch {
    // non bloccare mai il flusso se Sentry non è configurato
  }
  // utile anche in locale e su Vercel logs
  // eslint-disable-next-line no-console
  console.error(err);
}
