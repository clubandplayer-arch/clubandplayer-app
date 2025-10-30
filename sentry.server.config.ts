import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // 👇 Etichetta corretta in Sentry (production / preview / development)
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  tracesSampleRate: 0.1,
});
