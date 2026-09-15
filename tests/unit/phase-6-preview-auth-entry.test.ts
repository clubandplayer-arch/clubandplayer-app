import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('email signup returns to the deployment that initiated it', () => {
  const signup = readFileSync('app/signup/SignupClient.tsx', 'utf8')
  assert.match(signup, /emailRedirectTo = `\$\{window\.location\.origin\}\/auth\/callback`/)
  assert.doesNotMatch(signup, /NEXT_PUBLIC_BASE_URL\s*\?\?\s*window\.location\.origin/)
})

test('Preview login runbook keeps OAuth remediation separate from C7 smoke', () => {
  const runbook = readFileSync('docs/european-expansion/phase-6-preview-isolation-and-c7-smoke.md', 'utf8')
  assert.match(runbook, /400 redirect_uri_mismatch/)
  assert.match(runbook, /jbovlevodfouwuvtdlja\.supabase\.co\/auth\/v1\/callback/)
  assert.match(runbook, /form \*\*email\/password\*\*/)
  assert.match(runbook, /non cambiare la configurazione Auth Production/)
})
