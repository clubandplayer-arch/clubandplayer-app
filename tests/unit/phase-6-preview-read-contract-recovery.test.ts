import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync('supabase/migrations/20261211140000_restore_public_read_contracts.sql', 'utf8')
const runbook = readFileSync(
  'supabase/runbooks/manual/20261211140000_apply_public_read_contracts_preview.sql',
  'utf8',
)
const audit = readFileSync('scripts/sports/reports/phase-6-preview-read-contract-audit.sql', 'utf8')
const fixture = readFileSync('supabase/preview-fixtures/phase-6-minimal-profile-smoke.sql', 'utf8')

test('player views remain security-invoker and receive only read access', () => {
  assert.match(migration, /security_invoker=true/)
  assert.match(migration, /grant select on table public\.players_view, public\.athletes_view to anon, authenticated/)
  assert.doesNotMatch(migration, /grant .*\b(insert|update|delete)\b.*(players_view|athletes_view)/i)
})

test('geography uses public reference read policies without write policies', () => {
  for (const table of ['regions', 'provinces', 'municipalities']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`))
    assert.match(migration, new RegExp(`create policy ${table}_reference_read`))
  }
  assert.doesNotMatch(migration, /create policy .* for (insert|update|delete)/i)
})

test('manual recovery is guarded, verifies effects, and records the exact version last', () => {
  assert.match(runbook, /fase6-github \(jbovlevodfouwuvtdlja\)/)
  assert.match(runbook, /version = '20261211130000' and name = 'complete_profile_edit_schema'/)
  assert.ok(runbook.indexOf('do $verify$') < runbook.indexOf('insert into supabase_migrations.schema_migrations'))
  assert.match(runbook, /'20261211140000', 'restore_public_read_contracts'/)
})

test('diagnostic is read-only and distinguishes every endpoint dependency', () => {
  assert.match(audit, /begin transaction read only/i)
  for (const relation of ['profiles', 'follows', 'players_view', 'athletes_view', 'current_player_fan_vote_counts', 'regions', 'provinces', 'municipalities']) {
    assert.match(audit, new RegExp(`public\\.${relation}`))
  }
  assert.match(audit, /rollback;/i)
})

test('Preview fixture contains only synthetic geography, registry clubs, and profiles', () => {
  assert.match(fixture, /Preview C7 Test Player/)
  assert.match(fixture, /ASD Preview C7 Test Club/)
  assert.match(fixture, /user_id, account_type/)
  assert.match(fixture, /'60000000-0000-4000-8000-000000000001'/)
  assert.doesNotMatch(fixture, /@|auth\.users|service_role/i)
})
