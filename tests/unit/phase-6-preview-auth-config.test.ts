import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('supabase/config.toml', 'utf8');
const migration = readFileSync('supabase/migrations/20250923_supabase_security.sql', 'utf8');
const fixture = readFileSync('tests/integration/sql/empty-supabase-platform-fixture.sql', 'utf8');

test('Auth policy uses supported branch configuration rather than database functions', () => {
  assert.match(config, /\[auth\][\s\S]*minimum_password_length = 12/);
  assert.match(config, /password_requirements = "lower_upper_letters_digits_symbols"/);
  assert.match(config, /\[auth\.email\][\s\S]*otp_expiry = 900/);
  assert.doesNotMatch(migration, /auth\.set_config|pg_catalog\.set_config|set_config\s*\(/);
});

test('local replay cannot hide unsupported Auth functions', () => {
  assert.doesNotMatch(fixture, /auth\.set_config/);
  assert.match(fixture, /Test-only stand-in/);
});

test('Preview preserves the reviewed Apple service id without committing a secret', () => {
  assert.match(config, /\[auth\.external\.apple\][\s\S]*enabled = true/);
  assert.match(config, /client_id = "com\.clubandplayer\.app\.service"/);
  assert.match(config, /secret = ""/);
  assert.doesNotMatch(config, /BEGIN PRIVATE KEY|client_secret|APPLE_SECRET\s*=/i);
});
