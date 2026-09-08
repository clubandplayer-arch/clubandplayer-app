import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runbook = readFileSync(new URL('../../docs/european-expansion/phase-5f-c-production-exclusive-apply-runbook.md', import.meta.url), 'utf8');
const postcheck = readFileSync(new URL('../../scripts/sports/reports/phase-5f-c-profile-primary-sport-post-apply-read-only.sql', import.meta.url), 'utf8');

test('5F-C runbook pins the exclusive migration and checksum', () => {
  assert.match(runbook, /20261208120000_profile_primary_sport\.sql/);
  assert.match(runbook, /313a56e370e700c2906987b944bbbefb2edd15ad7c7d51d435e1fa2d3022e9f3/);
  assert.match(runbook, /sha256sum --check --strict/);
  assert.match(runbook, /PASS_READY_TO_APPLY_5F_A/);
});

test('5F-C runbook bounds locks/time and requires stop gates around history', () => {
  assert.match(runbook, /lock_timeout=5s/);
  assert.match(runbook, /statement_timeout=60s/);
  assert.match(runbook, /ACCESS EXCLUSIVE/);
  assert.match(runbook, /post-check PASS/i);
  assert.match(runbook, /share row exclusive mode/i);
  assert.match(runbook, /insert into supabase_migrations\.schema_migrations\(version\)/i);
  assert.doesNotMatch(runbook, /supabase db push/);
  assert.doesNotMatch(runbook, /supabase migration repair/);
});

test('5F-C documents all nine Production triggers without changing them', () => {
  for (const trigger of [
    'enforce_single_platform_admin_profile', 'profiles_notify_draft_demotion',
    'profiles_set_visibility_status', 'profiles_sync_names', 'set_updated_at',
    'trg_profile_location_coerce', 'trg_profiles_fill_default_role',
    'trg_profiles_fill_role_for_fan', 'trg_profiles_updated_at',
  ]) assert.ok(runbook.includes(trigger), `missing Production trigger: ${trigger}`);
  assert.match(runbook, /non disabilita\/ricrea trigger/i);
});

test('post-check is read-only and verifies schema, trigger preservation, no backfill and history', () => {
  assert.match(postcheck, /begin transaction read only;/i);
  assert.match(postcheck, /rollback;/i);
  assert.match(postcheck, /'profileTriggerCount'/);
  assert.match(postcheck, /'disabledProfileTriggerCount'/);
  assert.match(postcheck, /'canonicalNonNullRows'/);
  assert.match(postcheck, /version = '20261208120000'/);
  const executable = postcheck.replace(/^--.*$/gm, '').replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(executable, /\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke|lock)\b\s/i);
});
