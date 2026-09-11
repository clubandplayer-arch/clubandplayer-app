import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const fixture = readFileSync('supabase/preview-fixtures/phase-6-minimal-profile-smoke.sql', 'utf8')

test('Phase 6 fixture is Preview-only, synthetic and outside migration history', () => {
  assert.match(fixture, /PREVIEW-ONLY/)
  assert.match(fixture, /jbovlevodfouwuvtdlja/)
  assert.match(fixture, /Preview Test Region/)
  assert.match(fixture, /Preview C7 Test Club/)
  assert.doesNotMatch(fixture, /auth\.users|@|codice_fiscale\s*[,)]/i)
})

test('Phase 6 fixture is idempotent and keeps C7/C8 identities separate', () => {
  assert.match(fixture, /on conflict \(master_id\) do update/i)
  assert.match(fixture, /'Calcio a 7'/)
  assert.match(fixture, /'Calcio a 8'/)
  assert.doesNotMatch(fixture, /insert into public\.profiles/i)
})

test('Profile write diagnostics correlate failures without returning database details', () => {
  const route = readFileSync('app/api/profiles/me/route.ts', 'utf8')
  assert.match(route, /const traceId = crypto\.randomUUID\(\)/)
  assert.match(route, /safeDatabaseMessage\(error\)/)
  assert.match(route, /process\.env\.VERCEL_ENV === 'preview'/)
  assert.match(route, /diagnosticCode, diagnosticMessage/)
  assert.doesNotMatch(route, /console\.error\([^)]*user\.id/s)
})

test('Profile form displays the safe Preview diagnostic and correlation reference', () => {
  const form = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8')
  assert.match(form, /j\?\.diagnosticCode, j\?\.diagnosticMessage/)
  assert.match(form, /j\?\.traceId \? `rif\. \$\{j\.traceId\}`/)
})
