import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL(
  '../../scripts/sports/reports/phase-5f-b-profile-primary-sport-preflight-read-only.sql',
  import.meta.url,
), 'utf8');

test('5F-B preflight is transactionally read-only and emits one JSON report', () => {
  assert.match(sql, /begin transaction read only;/i);
  assert.match(sql, /current_setting\('transaction_read_only'\)/i);
  assert.match(sql, /jsonb_pretty\(jsonb_build_object\(/i);
  assert.match(sql, /rollback;/i);
  assert.equal((sql.match(/\bselect jsonb_pretty\(/gi) ?? []).length, 1);
});

test('5F-B checks prerequisites, 5C candidate keys, collisions, triggers and history separately', () => {
  for (const value of [
    'profiles', 'sports', 'sport_disciplines', 'sport_variants',
    'sport_id', 'sport_discipline_id', 'sport_variant_id',
    'profiles_primary_sport_fk', 'profiles_primary_sport_discipline_sport_fk',
    'profiles_primary_sport_variant_discipline_fk', 'profiles_primary_sport_shape_check',
    '20261206120000', '20261207120000', '20261208120000',
    'profileTriggers', 'migrationHistory',
  ]) assert.ok(sql.includes(value), `missing preflight check: ${value}`);
});

test('5F-B distinguishes ready, already applied and fail-closed states', () => {
  for (const status of [
    'PASS_READY_TO_APPLY_5F_A', 'PASS_5F_A_ALREADY_APPLIED',
    'BLOCKED_PREREQUISITE_SCHEMA', 'BLOCKED_5C_CANDIDATE_KEYS',
    'BLOCKED_5C_HISTORY', 'BLOCKED_DUPLICATE_5F_A_HISTORY',
    'BLOCKED_INCOMPATIBLE_COLLISION', 'BLOCKED_PARTIAL_OR_HISTORY_DRIFT',
  ]) assert.ok(sql.includes(status), `missing classification: ${status}`);
});

test('5F-B contains no mutation, explicit lock, push or history repair', () => {
  const executableSql = sql.replace(/^--.*$/gm, '');
  assert.doesNotMatch(executableSql, /\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke)\b\s+(?:table|into|from|public\.|supabase_migrations)/i);
  assert.doesNotMatch(executableSql, /\b(?:lock table|pg_advisory|db push|migration repair)\b/i);
  assert.match(sql, /'phase5dCRequiredFor5fA', false/);
  assert.match(sql, /'explicitLocksTaken', false/);
});
