import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const checker = path.resolve('scripts/check-vercel-env.mjs');
const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  RESEND_API_KEY: 'resend',
  RESEND_FROM: 'no-reply@example.com',
  BRAND_REPLY_TO: 'support@example.com',
  NOOP_EMAILS: '0',
  SENTRY_DSN: 'dsn',
  NEXT_PUBLIC_SENTRY_DSN: 'dsn',
  SENTRY_ENVIRONMENT: 'test',
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'test',
  SENTRY_RELEASE: 'release',
  NEXT_PUBLIC_SENTRY_RELEASE: 'release',
  NEXT_PUBLIC_ANALYTICS_DOMAIN: 'example.com',
  NEXT_PUBLIC_ANALYTICS_SRC: 'https://example.com/script.js',
  NEXT_PUBLIC_ANALYTICS_API: 'https://example.com/api',
  NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED: 'false',
  CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED: 'false',
  CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS:
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

function serialize(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n');
}

function runChecker(overrides: Record<string, string> = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'vercel-b4-env-'));
  try {
    const file = path.join(directory, '.env');
    writeFileSync(file, serialize({ ...baseEnv, ...overrides }));
    return spawnSync(process.execPath, [checker, `--local=${file}`, `--preview=${file}`, `--production=${file}`], {
      encoding: 'utf8',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('Vercel env checker accepts the fail-closed two-user B4.4 canary configuration', () => {
  const result = runChecker();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /B4\.4 fail-closed/);
  assert.doesNotMatch(result.stdout, /aaaaaaaa|bbbbbbbb/);
});

test('Vercel env checker rejects an enabled B4.4 gate', () => {
  const result = runChecker({ CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED: 'true' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /B4\.4 non sicuro/);
});

test('Vercel env checker rejects missing, malformed or duplicate canary UUIDs', () => {
  for (const allowlist of ['', 'invalid,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']) {
    const result = runChecker({ CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS: allowlist });
    assert.notEqual(result.status, 0, `allowlist unexpectedly accepted: ${allowlist}`);
  }
});
