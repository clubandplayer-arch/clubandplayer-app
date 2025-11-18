import * as Sentry from '@sentry/nextjs';
import { sentryEnvironment, sentryRelease } from './lib/sentry/config';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // 👇 Etichetta corretta in Sentry (production / preview / development)
  environment: sentryEnvironment,
  release: sentryRelease,

  tracesSampleRate: 0.1,
});
