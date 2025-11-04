import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN: ok anche con fallback al NEXT_PUBLIC per preview/dev
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,

  // Abilita Sentry solo se esiste un DSN (coerente con il tuo setup)
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Etichetta ambiente corretta: production / preview / development (da Vercel)
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // ✅ Release esplicita: usa variabile SENTRY_RELEASE se c'è,
  // altrimenti lo SHA della build Vercel (taggatura eventi server)
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,

  // Tracing leggero (puoi alzare in futuro se ti serve)
  tracesSampleRate: 0.1,
});
