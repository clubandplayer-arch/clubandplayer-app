import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  'supabase/migrations/20261211150000_restore_profile_geo_area_interest_read.sql',
  'utf8',
)
const runbook = readFileSync(
  'supabase/runbooks/manual/20261211150000_apply_profile_geo_area_interest_read_preview.sql',
  'utf8',
)

test('recovery grants only authenticated SELECT on the identified private table', () => {
  assert.match(migration, /grant select on table public\.profile_geo_area_interests to authenticated/)
  assert.doesNotMatch(migration, /\bto anon\b/i)
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)/i)
})

test('recovery requires RLS and the existing owner SELECT policy', () => {
  for (const sql of [migration, runbook]) {
    assert.match(sql, /relrowsecurity/)
    assert.match(sql, /profile_geo_area_interests_select_own_or_admin/)
    assert.match(sql, /cmd = 'SELECT'/)
  }
})

test('Preview runbook verifies the effect before recording exact history', () => {
  assert.match(runbook, /fase6-github \(jbovlevodfouwuvtdlja\)/)
  assert.match(runbook, /version = '20261211140000' and name = 'restore_public_read_contracts'/)
  assert.ok(runbook.indexOf('do $verify$') < runbook.indexOf('insert into supabase_migrations.schema_migrations'))
  assert.match(runbook, /'20261211150000', 'restore_profile_geo_area_interest_read'/)
})
