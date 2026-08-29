#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const defaults = {
  local: '.env.local',
  preview: '.env.vercel.preview',
  production: '.env.vercel.production',
};

const args = process.argv.slice(2);
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const [rawKey, ...rest] = arg.slice(2).split('=');
  const key = rawKey.trim();
  if (!key) continue;
  const value = rest.length ? rest.join('=') : undefined;
  defaults[key] = value ?? 'true';
}

function readEnvFile(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || !line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    let value = line.slice(idx + 1);
    value = value?.trim?.() ?? '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return { path: absolute, vars };
}

const categories = [
  {
    name: 'Supabase',
    keys: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  },
  {
    name: 'Resend',
    keys: ['RESEND_API_KEY', 'RESEND_FROM', 'BRAND_REPLY_TO', 'NOOP_EMAILS'],
  },
  {
    name: 'Sentry',
    keys: [
      'SENTRY_DSN',
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENTRY_ENVIRONMENT',
      'NEXT_PUBLIC_SENTRY_ENVIRONMENT',
      'SENTRY_RELEASE',
      'NEXT_PUBLIC_SENTRY_RELEASE',
    ],
  },
  {
    name: 'Analytics',
    keys: ['NEXT_PUBLIC_ANALYTICS_DOMAIN', 'NEXT_PUBLIC_ANALYTICS_SRC', 'NEXT_PUBLIC_ANALYTICS_API'],
  },
  {
    name: 'B4.4 canonical residence canary',
    keys: [
      'NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED',
      'CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED',
      'CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS',
    ],
  },
];

const requiredKeys = Array.from(new Set(categories.flatMap((c) => c.keys)));

const envFiles = {};
let exitCode = 0;

for (const [label, filePath] of Object.entries(defaults)) {
  try {
    envFiles[label] = readEnvFile(filePath);
  } catch (err) {
    const hint =
      label === 'preview'
        ? "Genera il file con `vercel env pull .env.vercel.preview --environment preview`."
        : label === 'production'
          ? "Genera il file con `vercel env pull .env.vercel.production --environment production`."
          : 'Crea `.env.local` partendo da docs/env.sample.';
    console.error(`[${label}] impossibile leggere ${filePath}: ${err.message}`);
    console.error(hint);
    exitCode = 1;
  }
}

if (!envFiles.local) {
  process.exit(exitCode || 1);
}

function valueIsSet(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function reportMissing(label, vars) {
  const missing = requiredKeys.filter((key) => !valueIsSet(vars[key]));
  if (missing.length) {
    exitCode = 1;
    console.error(`[${label}] variabili mancanti o vuote: ${missing.join(', ')}`);
  } else {
    console.log(`[${label}] tutte le variabili richieste sono valorizzate.`);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function explicitlyDisabled(value) {
  return ['0', 'false', 'no', 'off'].includes(String(value ?? '').trim().toLowerCase());
}

function validateResidenceCanary(label, vars) {
  const uiDisabled = explicitlyDisabled(vars.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED);
  const writesDisabled = explicitlyDisabled(vars.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED);
  const userIds = String(vars.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const uniqueUserIds = new Set(userIds);
  const allowlistValid = userIds.length === 2
    && uniqueUserIds.size === 2
    && userIds.every((value) => UUID_PATTERN.test(value));

  if (!uiDisabled || !writesDisabled || !allowlistValid) {
    exitCode = 1;
    console.error(
      `[${label}] B4.4 non sicuro: UI e write gate devono essere esplicitamente disabilitati e la allowlist deve contenere esattamente due UUID validi e distinti.`,
    );
    return;
  }

  console.log(`[${label}] B4.4 fail-closed: gate disabilitati e allowlist canary valida (2 UUID).`);
}

reportMissing('local', envFiles.local.vars);
validateResidenceCanary('local', envFiles.local.vars);

const localDefined = new Set(requiredKeys.filter((key) => valueIsSet(envFiles.local.vars[key])));

for (const label of ['preview', 'production']) {
  const file = envFiles[label];
  if (!file) continue;
  reportMissing(label, file.vars);
  validateResidenceCanary(label, file.vars);
  const envDefined = new Set(requiredKeys.filter((key) => valueIsSet(file.vars[key])));
  const missingComparedToLocal = [...localDefined].filter((key) => !envDefined.has(key));
  if (missingComparedToLocal.length) {
    exitCode = 1;
    console.error(
      `[${label}] mancano variabili presenti in ${defaults.local}: ${missingComparedToLocal.join(', ')}`,
    );
  } else {
    console.log(`[${label}] set di variabili coerente con ${defaults.local}.`);
  }
  const onlyInEnv = [...envDefined].filter((key) => !localDefined.has(key));
  if (onlyInEnv.length) {
    console.warn(`[${label}] definisce variabili non valorizzate in ${defaults.local}: ${onlyInEnv.join(', ')}`);
  }
}

if (exitCode) {
  console.error('Allineamento ambienti incompleto: correggi le variabili e ripeti il check.');
} else {
  console.log('Allineamento ambienti completato: Preview/Production sono coerenti con .env.local.');
}

process.exit(exitCode);
