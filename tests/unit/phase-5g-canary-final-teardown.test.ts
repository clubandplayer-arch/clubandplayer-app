import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql=readFileSync('scripts/sports/reports/phase-5g-canary-final-teardown-read-only.sql','utf8');
const runner=readFileSync('scripts/run-phase-5g-canary-final-teardown-verification.sh','utf8');

test('5G final teardown report is read-only and checks all authorized residue keys',()=>{
  assert.match(sql,/begin transaction read only/i);
  assert.match(sql,/rollback;/i);
  for (const table of ['auth.users','public.profiles','public.opportunities','public.applications']) assert.match(sql,new RegExp(table.replace('.','\\.')));
  assert.match(sql,/PASS_PHASE_5G_CANARY_FINAL_TEARDOWN/);
  assert.doesNotMatch(sql,/\b(insert|update|delete|alter|drop|truncate|create)\b/i);
});

test('5G final teardown runner hides credentials and fails closed on nonzero residue',()=>{
  assert.match(runner,/set -eo pipefail/);
  assert.doesNotMatch(runner,/set -u/);
  assert.match(runner,/read -rsp 'PRODUCTION_DATABASE_URL senza password/);
  assert.match(runner,/psql .* -W /);
  assert.match(runner,/\.counts == \{auth_users:0, profiles:0, opportunities:0, applications:0\}/);
});
