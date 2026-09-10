import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const report = readFileSync(new URL('../../scripts/sports/reports/phase-5f-canary-account-qualification-read-only.sql', import.meta.url), 'utf8');

test('5F canary account qualification is parameterized, read-only and rolled back', () => {
  assert.match(report, /begin transaction read only/i);
  assert.match(report, /:'canary_user_id'::uuid/);
  assert.match(report, /current_setting\('transaction_read_only'\)/);
  assert.match(report, /rollback;\s*$/i);
  assert.doesNotMatch(report, /\b(insert|update|delete|alter|create|drop|truncate|grant|revoke)\b\s+(?:table|into|from|on|public|auth)/i);
});

test('5F canary account qualification covers identity, admin, baselines and mapping', () => {
  for (const marker of [
    'BLOCKED_AUTH_USER_CARDINALITY',
    'BLOCKED_PROFILE_CARDINALITY',
    'BLOCKED_NOT_STAFF',
    'BLOCKED_ROLE_MISMATCH',
    'BLOCKED_ADMIN_SIGNAL',
    'BLOCKED_PROFILE_CANONICAL_BASELINE_NOT_NULL',
    'BLOCKED_EXPERIENCE_CANONICAL_BASELINE_NOT_NULL',
    'BLOCKED_LEGACY_SPORT_MAPPING',
  ]) assert.ok(report.includes(marker), `missing ${marker}`);
  assert.match(report, /legacy_sport_mappings/);
  assert.match(report, /athlete_experiences/);
});

test('5F canary technical PASS cannot attest disposability and emits no PII', () => {
  assert.match(report, /PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING/);
  assert.match(report, /'disposableAttestationRequired', true/);
  assert.match(report, /'containsPii', false/);
  assert.doesNotMatch(report, /jsonb_build_object\([\s\S]*'email'/i);
  assert.doesNotMatch(report, /full_name|display_name|club_name|location/i);
});
