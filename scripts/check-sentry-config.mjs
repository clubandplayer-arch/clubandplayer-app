#!/usr/bin/env node

console.log('== Check configurazione Sentry ==');

const required = ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ENVIRONMENT', 'NEXT_PUBLIC_SENTRY_ENVIRONMENT'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Errore: mancano variabili richieste (${missing.join(', ')})`);
  console.error('Imposta DSN ed environment coerenti (server e client) prima di attivare Sentry.');
  process.exit(1);
}

if (process.env.SENTRY_DSN !== process.env.NEXT_PUBLIC_SENTRY_DSN) {
  console.warn('Attenzione: SENTRY_DSN e NEXT_PUBLIC_SENTRY_DSN differiscono. Usa lo stesso DSN su server e client.');
}

if (process.env.SENTRY_ENVIRONMENT !== process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT) {
  console.warn('Attenzione: SENTRY_ENVIRONMENT e NEXT_PUBLIC_SENTRY_ENVIRONMENT non coincidono.');
}

const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA;
if (!release) {
  console.warn('Suggerimento: imposta SENTRY_RELEASE (o definisci VERCEL_GIT_COMMIT_SHA) per taggare la release.');
} else if (!process.env.SENTRY_RELEASE) {
  console.warn(`Nota: SENTRY_RELEASE non è impostato; userai VERCEL_GIT_COMMIT_SHA=${release}.`);
}

if (!process.env.NEXT_PUBLIC_SENTRY_RELEASE) {
  console.warn('Nota: NEXT_PUBLIC_SENTRY_RELEASE non è impostato. Per tracciare lato client, allinealo a SENTRY_RELEASE.');
}

console.log('Configurazione base presente: Sentry può tracciare errori con environment e (opzionale) release.');
