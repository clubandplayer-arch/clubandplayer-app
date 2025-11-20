/* eslint-env node */
import fs from 'node:fs';

/**
 * Verifica rapida delle variabili flag/allowlist usate da `/clubs`.
 *
 * Esegui:
 *   node scripts/check-clubs-flags.mjs [--env-file .env.vercel.preview]
 *
 * Exit code 0 se la configurazione appare coerente, 1 in caso di warning.
 */

const envFiles = [];
const args = process.argv.slice(2);
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
  }
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
const adminEmails = listFromEnv(process.env.ADMIN_EMAILS);

const overlap = serverAllowlist.filter((email) => adminEmails.includes(email));

const warnings = [];

if (featureAdmin && serverAllowlist.length === 0) {
  warnings.push('Flag admin attivo ma allowlist server vuota (CLUBS_ADMIN_EMAILS).');
}

if (featureAdmin && adminEmails.length === 0) {
  warnings.push('Flag admin attivo ma ADMIN_EMAILS è vuoto: non c\'è un account monitorato.');
}

if (featureAdmin && adminEmails.length > 0 && overlap.length === 0) {
  warnings.push('Nessuna email compare sia in CLUBS_ADMIN_EMAILS sia in ADMIN_EMAILS (serve almeno un admin monitorato).');
}

const missingOnClient = serverAllowlist.filter((email) => !clientAllowlist.includes(email));
if (missingOnClient.length > 0) {
  warnings.push(`Email allowlist non replicate lato client (facoltativo): ${missingOnClient.join(', ')}`);
}

console.log('== Flag /clubs ==');
console.log(`NEXT_PUBLIC_FEATURE_CLUBS_READONLY: ${featureReadOnly ? 'ON' : 'OFF'}`);
console.log(`NEXT_PUBLIC_FEATURE_CLUBS_ADMIN: ${featureAdmin ? 'ON' : 'OFF'}`);
console.log('Client allowlist:', clientAllowlist.length ? clientAllowlist.join(', ') : '(vuota)');
console.log('Server allowlist:', serverAllowlist.length ? serverAllowlist.join(', ') : '(vuota)');
console.log('Admin (ADMIN_EMAILS):', adminEmails.length ? adminEmails.join(', ') : '(vuoto)');
console.log('Overlap admin monitorati:', overlap.length ? overlap.join(', ') : '(nessuno)');

if (warnings.length > 0) {
  console.error('\n✗ Warning configurazione:');
  for (const w of warnings) {
    console.error('-', w);
  }
  process.exitCode = 1;
} else {
  console.log('\n✓ Configurazione coerente (client/server).');
}
