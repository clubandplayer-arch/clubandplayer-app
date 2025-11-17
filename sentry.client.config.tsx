import * as Sentry from '@sentry/nextjs';

const environment =
  process.env.SENTRY_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  'development';

const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA;

const ignoreErrors = [
  // Rumore comune sui browser moderni: non impatta l'utente
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  // Errori di rete transitori o abort espliciti
  /NetworkError when attempting to fetch resource/i,
  /AbortError: The user aborted a request/i,
];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 👇 Etichetta corretta in Sentry (production / preview / development)
  environment,
  release,

  // Riduce il rumore più comune lato client
  ignoreErrors,

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Lasciamo l’integrazione default
  integrations: (integrations) => integrations,
});
