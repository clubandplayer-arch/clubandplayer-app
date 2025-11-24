import * as Sentry from '@sentry/nextjs';
import {
  denyUrls,
  ignoreErrors,
  sentryEnvironment,
  sentryRelease,
} from './lib/sentry/config';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 👇 Etichetta corretta in Sentry (production / preview / development)
  environment: sentryEnvironment,
  release: sentryRelease,

  // Riduce il rumore più comune lato client
  ignoreErrors,
  denyUrls,

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Lasciamo l’integrazione default
  integrations: (integrations) => integrations,
});
