import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runner = readFileSync('scripts/run-phase-5g-production-exclusive-apply.sh', 'utf8');

test('5G apply is pinned, exclusive and registers history only after schema PASS', () => {
  assert.match(runner, /20261210120000_opportunity_canonical_sports_context\.sql/);
  assert.match(runner, /bf6eb4a7f8bc202c78ab3759c3b1b5ea80610db276672dd6d3719792b4ab7c9f/);
  assert.match(runner, /lock_timeout=5s/);
  assert.match(runner, /statement_timeout=120s/);
  assert.ok(runner.indexOf('PASS_SCHEMA_READY_FOR_HISTORY') < runner.indexOf("insert into supabase_migrations.schema_migrations"));
  assert.match(runner, /where version='20261210120000'/);
  assert.doesNotMatch(runner, /supabase db push|migration repair|20261209120000_athlete/);
});

test('5G apply proves no backfill and emits a bounded final marker', () => {
  assert.match(runner, /\.schema\.canonicalRows == 0/);
  assert.match(runner, /\.classification == "PASS_ALREADY_APPLIED"/);
  assert.match(runner, /PHASE_5G_PRODUCTION_SCHEMA_ROLLOUT_COMPLETE history_5g=1 columns=6 constraints=8 indexes=3 canonical_rows=0/);
});
