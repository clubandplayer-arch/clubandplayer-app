import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync('app/api/follows/suggestions/route.ts', 'utf8')
const viewerGeographyAudit = readFileSync(
  'scripts/sports/reports/phase-6-preview-viewer-geography-audit.sql',
  'utf8',
)

test('suggestion diagnostics are Preview-only and response-safe', () => {
  assert.match(route, /process\.env\.VERCEL_ENV === 'preview' && url\.searchParams\.get\('debug'\) === '1'/)
  assert.match(route, /endpointVersion: ENDPOINT_VERSION, step, errorCode:/)
  assert.doesNotMatch(route, /details = debugMode[\s\S]*\.\.\.debugInfo/)
  assert.doesNotMatch(route, /\{ ok: false[\s\S]*errorDebug/)
})

test('suggestion candidate dependencies have distinct diagnostic stages', () => {
  for (const step of ['candidateProfiles', 'fanVoteCounts', 'athleteDisplay', 'clubVerification', 'complete']) {
    assert.match(route, new RegExp(`step = '${step}'`))
  }
})

test('viewer geography audit is read-only and covers every query dependency', () => {
  assert.match(viewerGeographyAudit, /begin transaction read only/i)
  for (const relation of [
    'profile_preferences',
    'profile_country_interests',
    'profile_geo_area_interests',
    'countries',
    'geo_areas',
  ]) {
    assert.match(viewerGeographyAudit, new RegExp(`\\('${relation}'\\)`))
  }
  assert.match(viewerGeographyAudit, /has_table_privilege\('authenticated'/)
  assert.match(viewerGeographyAudit, /rollback;/i)
  assert.doesNotMatch(viewerGeographyAudit, /\b(insert|update|delete|alter|drop|truncate|create)\b/i)
})
