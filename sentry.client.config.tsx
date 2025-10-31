import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 👇 Etichetta corretta in Sentry (production / preview / development)
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Lasciamo l’integrazione default
  integrations: (integrations) => integrations,
});
