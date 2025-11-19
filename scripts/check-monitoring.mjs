/* eslint-env node */
import fs from 'node:fs';

const args = process.argv.slice(2);
const envFiles = [];
let sendEvent = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--env-file' || arg === '-f') {
    const file = args[i + 1];
    if (!file) {
      console.error('Parametro --env-file senza percorso.');
      process.exit(1);
    }
    envFiles.push(file);
    i += 1;
  } else if (arg === '--send-event') {
    sendEvent = true;
  }
}

if (envFiles.length === 0 && fs.existsSync('.env.local')) {
  envFiles.push('.env.local');
}

for (const file of envFiles) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        process.env[key] = value;
      });
    console.log(`Caricata configurazione da ${file}`);
  } catch (error) {
    console.error(`Impossibile leggere ${file}:`, error.message);
    process.exit(1);
  }
}

function resolveSentryEnv() {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development'
  );
}

function resolveSentryRelease() {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    ''
  );
}

const problems = [];
const warnings = [];
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryEnv = resolveSentryEnv();
const sentryRelease = resolveSentryRelease();
const analyticsDomain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN || '';

if (!sentryDsn) {
  problems.push('SENTRY_DSN o NEXT_PUBLIC_SENTRY_DSN non configurato.');
}

if (!sentryRelease) {
  warnings.push('Release Sentry non impostata (fallback su commit SHA consigliato).');
}

if (!analyticsDomain) {
  warnings.push('NEXT_PUBLIC_ANALYTICS_DOMAIN non impostato: analytics disabilitati (ok in dev).');
}

if (process.env.NEXT_PUBLIC_ANALYTICS_AUTOLOAD === '1') {
  problems.push('NEXT_PUBLIC_ANALYTICS_AUTOLOAD=1 bypasserebbe il consenso (rimuoverlo).');
}

console.log('\n== Monitoraggio ==');
console.log('Sentry DSN:', sentryDsn ? 'configurato' : 'mancante');
console.log('Sentry environment:', sentryEnv);
console.log('Sentry release:', sentryRelease || '(vuota)');
console.log('Analytics domain:', analyticsDomain || '(disabilitato)');

if (warnings.length > 0) {
  console.warn('\n⚠️  Warning:');
  warnings.forEach((w) => console.warn('-', w));
}

if (problems.length > 0) {
  console.error('\n✗ Errori di configurazione:');
  problems.forEach((p) => console.error('-', p));
  process.exitCode = 1;
}

async function sendSentryEvent() {
  if (!sendEvent) return;
  if (!sentryDsn) {
    console.error('Impossibile inviare evento: DSN non configurato.');
    process.exit(1);
  }
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnv,
    release: sentryRelease || undefined,
    tracesSampleRate: 0,
  });
  const id = Sentry.captureMessage('[monitoring-check] ping', 'info');
  await Sentry.flush(2000);
  console.log(`Evento di test inviato (id: ${id}). Verifica in Sentry che environment/release coincidano.`);
}

await sendSentryEvent();
