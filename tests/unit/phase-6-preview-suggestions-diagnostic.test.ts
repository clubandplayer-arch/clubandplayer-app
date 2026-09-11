import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const route = readFileSync('app/api/follows/suggestions/route.ts', 'utf8')

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
