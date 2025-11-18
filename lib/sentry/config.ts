const sentryEnvironment =
  process.env.SENTRY_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  'development';

const sentryRelease =
  process.env.SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA;

// Rumore comune lato browser/edge da ignorare per evitare alert inutili
const ignoreErrors = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  /NetworkError when attempting to fetch resource/i,
  /AbortError: The user aborted a request/i,
  /The user aborted a request/i,
  /Request was aborted/i,
  /Request timeout|Network request failed/i,
];

// Estensioni browser o URL noti per generare errori non azionabili
const denyUrls = [/extensions\//i, /^chrome-extension:/i, /^moz-extension:/i];

export { sentryEnvironment, sentryRelease, ignoreErrors, denyUrls };
