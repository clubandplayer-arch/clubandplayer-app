import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const plan = readFileSync('supabase/runbooks/manual/opportunity_legacy_geography_backfill_plan.sql', 'utf8');
const audit = readFileSync('supabase/runbooks/manual/audit_opportunity_legacy_geography_backfill.sql', 'utf8');
const apply = readFileSync('supabase/runbooks/manual/apply_opportunity_legacy_geography_backfill.sql', 'utf8');
const rollback = readFileSync('supabase/rollbacks/20261205_opportunity_legacy_geography_backfill.sql', 'utf8');

test('C7 backfill remains a manual gated runbook, not an automatic migration', () => {
  assert.match(apply, /Do not execute until the audit counts and Preview/);
  assert.match(audit, /rollback;/i);
  assert.doesNotMatch(apply, /delete\s+from\s+public\.|insert\s+into\s+public\./i);
});

test('plan accepts only explicit Italy aliases and exact hierarchical legacy matches', () => {
  assert.match(plan, /in \('it', 'italia', 'italy'\)/);
  assert.match(plan, /municipality\.province_id/);
  assert.match(plan, /municipality\.region_id/);
  assert.match(plan, /province\.sigla/);
  assert.doesNotMatch(plan, /ilike|similarity|levenshtein|soundex/i);
});

test('ambiguous and unresolved rows become country-only while unique deepest match wins', () => {
  assert.match(plan, /having count\(\*\) = 1/);
  assert.match(plan, /ambiguous_country_only/);
  assert.match(plan, /unresolved_country_only/);
  assert.match(plan, /when r\.specificity = 3 then 'municipality'/);
});

test('apply changes only canonical columns and is concurrency/idempotence guarded', () => {
  assert.match(apply, /pg_advisory_xact_lock/);
  assert.match(apply, /set country_id = plan\.country_id,\s*geo_area_id = plan\.geo_area_id/);
  assert.match(apply, /opportunity\.country_id is null/);
  assert.doesNotMatch(apply, /set[\s\S]{0,300}(owner_id|created_by|club_id|country =|region =|province =|city =)/i);
});

test('rollback is explicit-ID only and cannot clear every canonical opportunity', () => {
  assert.match(rollback, /c7_opportunity_backfill_rollback_ids/);
  assert.match(rollback, /where opportunity\.id = rollback\.id/);
  assert.doesNotMatch(rollback, /where opportunity\.country_id is not null/i);
});
