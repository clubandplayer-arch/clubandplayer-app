import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const report = readFileSync('scripts/sports/reports/phase-6-preview-migration-history-audit-read-only.sql', 'utf8')
const migrations = readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql')).sort()
const migrationVersions = migrations.flatMap((name) => name.match(/^([0-9]+)_/)?.[1] ?? [])

test('Preview history report embeds its exact legacy audit snapshot through 20261211150000', () => {
  const embedded = [...report.matchAll(/\('([0-9]+)',\s*'[^']+'\)/g)].map((match) => match[1])
  const audited = migrationVersions.filter((version) => version <= '20261211150000')
  assert.deepEqual(embedded.slice(0, audited.length), audited)
  assert.equal(new Set(audited).size, audited.length)
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

test('verified Preview head remains explicit while the next local migration stays unapplied', () => {
  const localVersions = [...migrationVersions].sort()
  const verifiedRemoteVersions = localVersions.filter((version) => version <= '20261212120000')
  const pendingLocalVersions = localVersions.filter((version) => version > '20261212120000')

  assert.equal(verifiedRemoteVersions.at(-1), '20261212120000')
  assert.deepEqual(pendingLocalVersions, ['20261213120000'])
  assert.equal(migrations.at(-1), '20261213120000_club_primary_organization_affiliation.sql')
})

test('mixed-length historical versions are compared as strings, not timestamps', () => {
  const localVersions = [...migrationVersions].sort()

  assert.ok(localVersions.indexOf('20251126') < localVersions.indexOf('20251126120000'))
  assert.ok(localVersions.indexOf('202605240001') < localVersions.indexOf('20260524000150'))
  assert.equal(new Set(localVersions).size, localVersions.length)
})
