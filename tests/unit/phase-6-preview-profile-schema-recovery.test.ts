import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync('supabase/migrations/20261211130000_complete_profile_edit_schema.sql', 'utf8')
const runbook = readFileSync(
  'supabase/runbooks/manual/20261211130000_apply_profile_edit_schema_preview.sql',
  'utf8',
)
const profileColumns = [...migration.matchAll(/add column if not exists ([a-z_]+)/g)].map((match) => match[1])

test('manual recovery applies exactly the canonical profile column set', () => {
  const runbookColumns = [...runbook.matchAll(/add column if not exists ([a-z_]+)/g)].map((match) => match[1])
  assert.deepEqual(runbookColumns, profileColumns)
})

test('manual recovery is Preview-guarded and records history after effect verification', () => {
  assert.match(runbook, /fase6-github \(jbovlevodfouwuvtdlja\)/)
  assert.match(runbook, /version = '20261211120000' and name = 'add_seven_a_side_football_variant'/)
  assert.match(runbook, /migration 20261211130000 is already recorded/)
  assert.match(runbook, /required profile\/geography schema is incomplete/)
  assert.ok(runbook.indexOf('do $verify$') < runbook.indexOf('insert into supabase_migrations.schema_migrations'))
  assert.match(runbook, /'20261211130000',\s*'complete_profile_edit_schema'/)
})

test('manual recovery is atomic and non-destructive', () => {
  assert.match(runbook, /begin;/)
  assert.match(runbook, /commit;/)
  assert.match(runbook, /add column if not exists/)
  assert.doesNotMatch(runbook, /\b(delete\s+from|truncate|drop\s+(table|schema)|reset\s+database)\b/i)
})
