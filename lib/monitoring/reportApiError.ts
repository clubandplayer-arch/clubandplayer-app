import * as Sentry from '@sentry/nextjs';

type Options = {
  endpoint: string;
  error: unknown;
  context?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info';
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export function reportApiError({ endpoint, error, context, level }: Options) {
  if (!sentryEnabled) return;
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'API error');

  Sentry.withScope((scope) => {
    scope.setTag('layer', 'api');
    scope.setTag('endpoint', endpoint);
    scope.setLevel(level ?? 'error');
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(err);
  });
}
