// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,     // performance sampling 10%
  replaysSessionSampleRate: 0, // attivalo se vuoi session replay
  integrations: (integrations) => integrations,
  environment: process.env.NODE_ENV,
});
