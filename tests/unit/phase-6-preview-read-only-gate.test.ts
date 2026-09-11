import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const script = readFileSync('scripts/verify-phase-6-preview-isolation.sh', 'utf8')

test('Preview verification is fail-closed and GET-only', () => {
  assert.match(script, /VERCEL_AUTOMATION_BYPASS_SECRET:\?Inject/)
  assert.match(script, /PHASE6_EXPECTED_DEPLOYMENT_SHA:\?Set/)
  assert.match(script, /x-vercel-protection-bypass:/)
  assert.doesNotMatch(script, /--request\s+(POST|PUT|PATCH|DELETE)/i)
  assert.doesNotMatch(script, /curl[^\n]+-[^\n]*X\s*(POST|PUT|PATCH|DELETE)/i)
  assert.doesNotMatch(script, /set\s+-[^\n]*x/)
})

test('Preview verification gates refs, credentials, SHA and C7 taxonomy', () => {
  for (const invariant of [
    "value.mode !== 'preview'",
    'value.publicProjectRef !== expectedRef',
    'value.serverProjectRef !== expectedRef',
    "value.serverUrlSource !== 'SUPABASE_URL'",
    'value.anonKeysMatch !== true',
    'value.serviceRoleConfigured !== true',
    "item.code === 'seven_a_side'",
    "item.legacyValue === 'Calcio a 7'",
  ]) assert.ok(script.includes(invariant), `missing invariant: ${invariant}`)
})

test('Preview verification never prints secret-bearing response bodies', () => {
  assert.match(script, /--output "\$output"/)
  assert.doesNotMatch(script, /cat\s+.*(env|catalog|registry)\.json/)
  assert.doesNotMatch(script, /echo.*VERCEL_AUTOMATION_BYPASS_SECRET/)
})
