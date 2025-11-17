/* eslint-env node */
/**
 * Verifica rapida delle variabili flag/allowlist usate da `/clubs`.
 *
 * Esegui:
 *   node scripts/check-clubs-flags.mjs
 *
 * Exit code 0 se la configurazione appare coerente, 1 in caso di warning.
 */

function boolFromEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function listFromEnv(value) {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

const featureReadOnly = boolFromEnv(process.env.NEXT_PUBLIC_FEATURE_CLUBS_READONLY, true);
const featureAdmin = boolFromEnv(process.env.NEXT_PUBLIC_FEATURE_CLUBS_ADMIN, false);
const clientAllowlist = listFromEnv(process.env.NEXT_PUBLIC_CLUBS_ADMIN_EMAILS);
const serverAllowlist = listFromEnv(process.env.CLUBS_ADMIN_EMAILS);

const warnings = [];

if (featureAdmin && clientAllowlist.length === 0 && serverAllowlist.length === 0) {
  warnings.push('Flag admin attivo ma allowlist vuota (NEXT_PUBLIC_CLUBS_ADMIN_EMAILS / CLUBS_ADMIN_EMAILS).');
}

const missingOnClient = serverAllowlist.filter((email) => !clientAllowlist.includes(email));
const missingOnServer = clientAllowlist.filter((email) => !serverAllowlist.includes(email));

if (missingOnClient.length > 0) {
  warnings.push(`Email solo lato server: ${missingOnClient.join(', ')}`);
}
if (missingOnServer.length > 0) {
  warnings.push(`Email solo lato client: ${missingOnServer.join(', ')}`);
}

console.log('== Flag /clubs ==');
console.log(`NEXT_PUBLIC_FEATURE_CLUBS_READONLY: ${featureReadOnly ? 'ON' : 'OFF'}`);
console.log(`NEXT_PUBLIC_FEATURE_CLUBS_ADMIN: ${featureAdmin ? 'ON' : 'OFF'}`);
console.log('Client allowlist:', clientAllowlist.length ? clientAllowlist.join(', ') : '(vuota)');
console.log('Server allowlist:', serverAllowlist.length ? serverAllowlist.join(', ') : '(vuota)');

if (warnings.length > 0) {
  console.error('\n✗ Warning configurazione:');
  for (const w of warnings) {
    console.error('-', w);
  }
  process.exitCode = 1;
} else {
  console.log('\n✓ Configurazione coerente (client/server).');
}
