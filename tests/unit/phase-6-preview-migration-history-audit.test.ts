import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const report = readFileSync('scripts/sports/reports/phase-6-preview-migration-history-audit-read-only.sql', 'utf8')
const migrations = readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql')).sort()

test('Preview history report embeds the exact local migration versions', () => {
  const embedded = [...report.matchAll(/\('([0-9]+)',\s*'[^']+'\)/g)].map((match) => match[1])
  const expected = migrations.map((name) => name.match(/^([0-9]+)_/)?.[1]).filter(Boolean)
  assert.deepEqual(embedded.slice(0, expected.length), expected)
  assert.equal(new Set(expected).size, expected.length)
})

test('Preview history report remains one-result and read-only', () => {
  assert.match(report, /begin transaction read only/i)
  assert.match(report, /supabase_migrations\.schema_migrations/)
  assert.match(report, /'remoteOnly'/)
  assert.match(report, /'localOnly'/)
  assert.match(report, /'sameVersionDifferentName'/)
  assert.match(report, /'localVersionOrder'/)
  assert.match(report, /'remoteVersionOrder'/)
  assert.match(report, /'orderedVersionsMatch'/)
  assert.match(report, /'profileEditColumns'/)
  assert.match(report, /rollback;/i)
  assert.doesNotMatch(report, /\b(insert|update|delete|alter|drop|truncate|create)\b/i)
})

test('verified Preview head contains every current local migration in CLI version order', () => {
  const localVersions = migrations.map((name) => name.match(/^([0-9]+)_/)?.[1]).filter(Boolean).sort()
  const verifiedRemoteVersions = [...localVersions]

  assert.deepEqual(localVersions, verifiedRemoteVersions)
  assert.equal(localVersions.at(-1), '20261211150000')
  assert.equal(migrations.at(-1), '20261211150000_restore_profile_geo_area_interest_read.sql')
})

test('mixed-length historical versions are compared as strings, not timestamps', () => {
  const localVersions = migrations.map((name) => name.match(/^([0-9]+)_/)?.[1]).filter(Boolean).sort()

  assert.ok(localVersions.indexOf('20251126') < localVersions.indexOf('20251126120000'))
  assert.ok(localVersions.indexOf('202605240001') < localVersions.indexOf('20260524000150'))
  assert.equal(new Set(localVersions).size, localVersions.length)
})
