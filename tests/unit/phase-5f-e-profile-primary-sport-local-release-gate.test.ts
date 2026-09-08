import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../../app/api/profiles/me/route.ts', import.meta.url), 'utf8');
const contract = readFileSync(new URL('../../lib/taxonomy/profilePrimarySportRuntimeContract.ts', import.meta.url), 'utf8');
const compatibility = readFileSync(new URL('../../lib/taxonomy/canonicalSportsCompatibility.ts', import.meta.url), 'utf8');
const doc = readFileSync(new URL('../../docs/european-expansion/phase-5f-e-profile-primary-sport-local-release-gate.md', import.meta.url), 'utf8');

test('5F-E route gate keeps planning before one owner-scoped mutation path', () => {
  const planning = route.indexOf('planProfilePrimarySportRequest');
  const mutation = route.indexOf(".from('profiles')\n    .update(");
  assert.ok(planning > 0 && mutation > planning);
  assert.match(route, /\.eq\('user_id', user\.id\)/);
  assert.match(route, /\.upsert\([\s\S]*user_id: user\.id[\s\S]*onConflict: 'user_id'/);
});

test('5F-E exposes stable validation, permission and opaque failure codes', () => {
  for (const code of [
    'conflicting_input', 'invalid_input', 'invalid_reference',
    'profile_primary_sport_forbidden', 'profile_primary_sport_write_failed',
  ]) assert.ok(contract.includes(code) || compatibility.includes(code), `missing stable code: ${code}`);
  assert.match(contract, /error\.code === '42501'/);
  assert.doesNotMatch(route, /jsonError\((?:up\.)?error\.message[^\n]*hasPrimarySportInput/);
});

test('5F-E remains local-only and records the material fixture limitations', () => {
  assert.match(doc, /PASS senza blocker residui/i);
  assert.match(doc, /non avvia un server Next/i);
  assert.match(doc, /stub nominali\/semantici/i);
  assert.match(doc, /NON DEPLOYATO, NESSUNA OPERAZIONE REMOTA/);
});
