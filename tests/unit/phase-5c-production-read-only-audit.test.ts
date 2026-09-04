import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  'scripts/sports/reports/phase-5c-production-preflight-and-baseline-audit-read-only.sql',
  'utf8',
).toLowerCase();

test('5C Production preflight is transactionally read-only', () => {
  assert.match(sql, /begin transaction read only;/);
  assert.match(sql, /rollback;/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|comment)\s+/);
  assert.doesNotMatch(sql, /\b(call|copy|vacuum|analyze|refresh)\s+/);
});

test('5C Production preflight checks history, dependencies and collisions', () => {
  assert.match(sql, /supabase_migrations\.schema_migrations/);
  assert.match(sql, /20261206120000/);
  for (const dependency of ['profiles', 'countries', 'geo_areas', 'sports', 'sport_disciplines', 'sport_variants']) {
    assert.match(sql, new RegExp(`'${dependency}'`));
  }
  assert.match(sql, /phase_5c_history_rows/);
  assert.match(sql, /collision/);
});

test('baseline audit inventories schema and security without function bodies', () => {
  for (const table of ['profiles', 'opportunities', 'clubs', 'saved_views', 'notifications', 'follows', 'posts', 'applications', 'regions', 'provinces', 'municipalities']) {
    assert.match(sql, new RegExp(`'${table}'`));
  }
  assert.match(sql, /information_schema\.columns/);
  assert.match(sql, /information_schema\.table_constraints/);
  assert.match(sql, /pg_indexes/);
  assert.match(sql, /pg_policies/);
  assert.match(sql, /role_table_grants/);
  assert.match(sql, /information_schema\.triggers/);
  assert.doesNotMatch(sql, /pg_get_functiondef/);
});
