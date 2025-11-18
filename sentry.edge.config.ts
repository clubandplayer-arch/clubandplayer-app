import * as Sentry from '@sentry/nextjs';
import {
  denyUrls,
  ignoreErrors,
  sentryEnvironment,
  sentryRelease,
} from './lib/sentry/config';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment,
  release: sentryRelease,
  ignoreErrors,
  denyUrls,
});
