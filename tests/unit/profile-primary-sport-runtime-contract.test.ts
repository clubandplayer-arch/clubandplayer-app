import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CanonicalSportsCompatibilityError } from '../../lib/taxonomy/canonicalSportsCompatibility';
import {
  mapProfilePrimarySportContractError,
  PROFILE_PRIMARY_SPORT_COLUMNS,
  projectProfilePrimarySportColumns,
} from '../../lib/taxonomy/profilePrimarySportRuntimeContract';

const route = readFileSync(new URL('../../app/api/profiles/me/route.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');
const foundation = readFileSync(new URL('../../supabase/migrations/20260822120000_european_catalog_foundation.sql', import.meta.url), 'utf8');
const phase5c = readFileSync(new URL('../../supabase/migrations/20261206120000_canonical_sports_competition_schema.sql', import.meta.url), 'utf8');

test('future Profile primary-sport projection is one complete four-column group', () => {
  assert.deepEqual(PROFILE_PRIMARY_SPORT_COLUMNS, [
    'sport', 'sport_id', 'sport_discipline_id', 'sport_variant_id',
  ]);
  assert.equal(projectProfilePrimarySportColumns({ action: 'no_change' }), null);
  assert.deepEqual(projectProfilePrimarySportColumns({
    action: 'write', source: 'canonical', legacyValue: 'Calcio',
    sportId: 'sport-id', disciplineId: 'discipline-id', variantId: 'variant-id',
  }), {
    sport: 'Calcio', sport_id: 'sport-id',
    sport_discipline_id: 'discipline-id', sport_variant_id: 'variant-id',
  });
  assert.deepEqual(projectProfilePrimarySportColumns({
    action: 'write', source: 'legacy_raw', legacyValue: 'Storico',
    sportId: null, disciplineId: null, variantId: null,
  }), {
    sport: 'Storico', sport_id: null,
    sport_discipline_id: null, sport_variant_id: null,
  });
});

test('contract maps validation errors to stable 400 codes and hides unexpected errors', () => {
  for (const code of ['conflicting_input', 'invalid_input', 'invalid_reference'] as const) {
    assert.deepEqual(mapProfilePrimarySportContractError(new CanonicalSportsCompatibilityError(code)), {
      status: 400, code,
    });
  }
  assert.deepEqual(mapProfilePrimarySportContractError(new Error('database detail')), {
    status: 500, code: 'profile_primary_sport_write_failed',
  });
});

test('current caller is PATCH /api/profiles/me and accepts only legacy sport', () => {
  assert.match(route, /export const PATCH = withAuth/);
  assert.match(route, /sport:\s*'text'/);
  assert.match(route, /if \(updates\.sport\) updates\.sport = normalizeSport/);
  assert.doesNotMatch(route, /sport_discipline_id|sport_variant_id/);
  assert.match(route, /\.from\('profiles'\)\s*\.update\(\{ \.\.\.updates, updated_at:/s);
  assert.match(route, /\.from\('profiles'\)\s*\.upsert\(/s);
});

test('current web client remains compatible because it sends only the optional legacy field', () => {
  assert.match(form, /sport: isClub \? \(sport \|\| ''\)\.trim\(\) \|\| null : null/);
  assert.match(form, /sport: \(athleteSport \|\| ''\)\.trim\(\) \|\| null/);
  assert.match(form, /fetch\('\/api\/profiles\/me', \{\s*method: 'PATCH'/s);
  assert.doesNotMatch(form, /sportId|disciplineId|variantId/);
});

test('existing Phase 1 and 5C migrations do not add canonical Profile sport columns', () => {
  for (const migration of [foundation, phase5c]) {
    assert.doesNotMatch(migration, /alter table(?: if exists)? public\.profiles[\s\S]*sport_(?:discipline|variant)_id/i);
  }
});
