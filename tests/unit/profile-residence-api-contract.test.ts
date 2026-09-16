import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  isCanonicalProfileResidenceUiEnabled,
  isCanonicalProfileResidenceWriteEnabled,
  isCanonicalProfileResidenceWriteUserAllowed,
} from '../../lib/env/features';

const route = readFileSync(new URL('../../app/api/profiles/me/residence/route.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');

test('canonical profile residence UI and writes are disabled by default', () => {
  const previousUi = process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED;
  const previousWrite = process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED;
  const previousAllowlist = process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS;
  delete process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED;
  delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED;
  delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS;
  assert.equal(isCanonicalProfileResidenceUiEnabled(), false);
  assert.equal(isCanonicalProfileResidenceWriteEnabled(), false);
  assert.equal(isCanonicalProfileResidenceWriteUserAllowed('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false);
  if (previousUi === undefined) delete process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED; else process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED = previousUi;
  if (previousWrite === undefined) delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED; else process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED = previousWrite;
  if (previousAllowlist === undefined) delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS; else process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS = previousAllowlist;
});

test('temporary residence canary allowlist accepts only explicitly configured valid user UUIDs', () => {
  const previous = process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS;
  process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS = ' AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA,invalid,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb ';

  assert.equal(isCanonicalProfileResidenceWriteUserAllowed('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), true);
  assert.equal(isCanonicalProfileResidenceWriteUserAllowed('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), true);
  assert.equal(isCanonicalProfileResidenceWriteUserAllowed('11111111-1111-4111-8111-111111111111'), false);
  assert.equal(isCanonicalProfileResidenceWriteUserAllowed('invalid'), false);
  assert.equal(isCanonicalProfileResidenceWriteUserAllowed(null), false);

  if (previous === undefined) delete process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS; else process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS = previous;
});

test('owner-only GET/PATCH contract keeps Player/Staff gates after Club role resolution', () => {
  assert.match(route, /export const GET = withAuth/);
  assert.match(route, /export const PATCH = withAuth/);
  const patch = route.slice(route.indexOf('export const PATCH'));
  assert.ok(patch.indexOf('isCanonicalProfileResidenceWriteEnabled') > patch.indexOf(".from('profiles')"));
  assert.ok(patch.indexOf('isCanonicalProfileResidenceWriteUserAllowed(user.id)') > patch.indexOf(".from('profiles')"));
  assert.match(patch, /writes are not enabled for this account', 403/);
  assert.match(route, /accountType === 'athlete' \|\| accountType === 'staff'/);
  assert.match(route, /accountType === 'club'/);
  assert.match(route, /parseResidencePatch\(body\)/);
  assert.match(route, /writeMyProfileResidence\(supabase, patch\)/);
  assert.doesNotMatch(route, /profile_id|profileId/);
});

test('ProfileEditForm shows the canonical selector to writable Club or Player/Staff canaries and sends no legacy residence payload', () => {
  assert.match(form, /residenceWritable && \(isClub \|\| \(canonicalResidenceUiEnabled && !isOrganization && !isFan\)\)/);
  assert.match(form, /<CanonicalGeographySelector/);
  assert.doesNotMatch(form, /disabled=\{!residenceWritable\}/);
  assert.doesNotMatch(form, /Modifica disabilitata fino alla certificazione Supabase/);
  assert.match(form, /body: JSON\.stringify\(\{ geography: \{ residenceCountryId, residenceGeoAreaId \} \}\)/);
  assert.doesNotMatch(form, /useState\('IT'\)/);
  assert.doesNotMatch(form, /interestCountry \|\| 'IT'/);
  const playerPayload = form.slice(form.indexOf('// PLAYER'), form.indexOf('// pulizia campi club', form.indexOf('// PLAYER')));
  assert.doesNotMatch(playerPayload, /residence_(?:region|province|municipality)_id/);
  assert.doesNotMatch(playerPayload, /\bregion:|\bprovince:|\bcity:/);
});
