import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isCanonicalProfileResidenceUiEnabled, isCanonicalProfileResidenceWriteEnabled } from '../../lib/env/features';

const route = readFileSync(new URL('../../app/api/profiles/me/residence/route.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');
const qaPage = readFileSync(new URL('../../app/qa/b4-profile-residence/page.tsx', import.meta.url), 'utf8');
const qaClient = readFileSync(new URL('../../app/qa/b4-profile-residence/B4ProfileResidencePreview.tsx', import.meta.url), 'utf8');

test('canonical profile residence UI and writes are disabled by default', () => {
  const previousUi = process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED;
  const previousWrite = process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED;
  delete process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED;
  delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED;
  assert.equal(isCanonicalProfileResidenceUiEnabled(), false);
  assert.equal(isCanonicalProfileResidenceWriteEnabled(), false);
  if (previousUi === undefined) delete process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED; else process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED = previousUi;
  if (previousWrite === undefined) delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED; else process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED = previousWrite;
});

test('owner-only GET/PATCH contract has a pre-query write kill switch and eligible roles only', () => {
  assert.match(route, /export const GET = withAuth/);
  assert.match(route, /export const PATCH = withAuth/);
  const patch = route.slice(route.indexOf('export const PATCH'));
  assert.ok(patch.indexOf('isCanonicalProfileResidenceWriteEnabled') < patch.indexOf(".from('profiles')"));
  assert.match(route, /accountType === 'athlete' \|\| accountType === 'staff'/);
  assert.match(route, /parseResidencePatch\(body\)/);
  assert.match(route, /writeMyProfileResidence\(supabase, patch\)/);
  assert.doesNotMatch(route, /profile_id|profileId/);
});

test('ProfileEditForm integrates canonical selector only for Player/Staff and sends no legacy residence payload', () => {
  assert.match(form, /canonicalResidenceUiEnabled && !isOrganization && !isFan/);
  assert.match(form, /<CanonicalGeographySelector/);
  assert.match(form, /body: JSON\.stringify\(\{ geography: \{ residenceCountryId, residenceGeoAreaId \} \}\)/);
  assert.doesNotMatch(form, /useState\('IT'\)/);
  assert.doesNotMatch(form, /interestCountry \|\| 'IT'/);
  const playerPayload = form.slice(form.indexOf('// PLAYER'), form.indexOf('// pulizia campi club', form.indexOf('// PLAYER')));
  assert.doesNotMatch(playerPayload, /residence_(?:region|province|municipality)_id/);
  assert.doesNotMatch(playerPayload, /\bregion:|\bprovince:|\bcity:/);
});

test('QA preview is noindex, fixture-only and cannot save remotely', () => {
  assert.match(qaPage, /robots: \{ index: false, follow: false \}/);
  assert.match(qaClient, /Fixture deterministiche/);
  assert.match(qaClient, /Salvataggio remoto disabilitato/);
  assert.doesNotMatch(qaClient, /fetch\(|createClient|from\(['"]@supabase|@\/lib\/supabase/i);
  for (const scenario of ['IT', 'FR', 'ES', 'CH', 'SI', 'PL', 'CH senza District', 'country-only', 'Reset completo']) assert.ok(qaClient.includes(scenario), scenario);
});
