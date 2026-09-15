import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CanonicalSportsCompatibilityError } from '../../lib/taxonomy/canonicalSportsCompatibility';
import {
  mapProfilePrimarySportContractError,
  planProfilePrimarySportRequest,
  PROFILE_PRIMARY_SPORT_COLUMNS,
  projectProfilePrimarySportColumns,
} from '../../lib/taxonomy/profilePrimarySportRuntimeContract';

const route = readFileSync(new URL('../../app/api/profiles/me/route.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../components/profiles/ProfileEditForm.tsx', import.meta.url), 'utf8');
const foundation = readFileSync(new URL('../../supabase/migrations/20260822120000_european_catalog_foundation.sql', import.meta.url), 'utf8');
const phase5c = readFileSync(new URL('../../supabase/migrations/20261206120000_canonical_sports_competition_schema.sql', import.meta.url), 'utf8');
const productionTriggerFixture = readFileSync(new URL('../integration/sql/profile-primary-sport-production-trigger-fixture.sql', import.meta.url), 'utf8');
const versionedTriggerFixture = readFileSync(new URL('../integration/sql/profile-residence-trigger-runtime-install.sql', import.meta.url), 'utf8');

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
  assert.deepEqual(mapProfilePrimarySportContractError({ code: '42501', message: 'private RLS detail' }), {
    status: 403, code: 'profile_primary_sport_forbidden',
  });
});

test('PATCH /api/profiles/me integrates the planner and keeps one atomic row mutation', () => {
  assert.match(route, /export const PATCH = withAuth/);
  assert.match(route, /sport:\s*'text'/);
  assert.match(route, /planProfilePrimarySportRequest/);
  assert.match(route, /CanonicalSportWritePlanService/);
  assert.match(route, /SportsTaxonomyRepository/);
  assert.match(route, /jsonError\(mapped\.code, mapped\.status, \{ code: mapped\.code \}\)/);
  assert.match(route, /\.from\('profiles'\)\s*\.update\(\{ \.\.\.updates, updated_at:/s);
  assert.match(route, /\.from\('profiles'\)\s*\.upsert\(/s);
  assert.doesNotMatch(route, /\.from\('profiles'\)[\s\S]*\.update\([^)]*sport_id[\s\S]*\.from\('profiles'\)[\s\S]*\.update\(/s);
});

test('request adapter preserves absent, legacy, reset and complete canonical groups', async () => {
  const calls: unknown[] = [];
  const planner = { plan: async (payload: unknown) => {
    calls.push(payload);
    return { action: 'write' as const, source: 'legacy_raw' as const, legacyValue: 'Storico',
      sportId: null, disciplineId: null, variantId: null };
  } };
  assert.deepEqual(await planProfilePrimarySportRequest({}, { plan: async (payload) => {
    calls.push(payload);
    return { action: 'no_change' as const };
  } }), null);
  assert.deepEqual(await planProfilePrimarySportRequest({ sport: ' Storico ' }, planner), {
    sport: 'Storico', sport_id: null, sport_discipline_id: null, sport_variant_id: null,
  });
  await planProfilePrimarySportRequest({ sport: null }, planner);
  await planProfilePrimarySportRequest({ primarySport: { reset: true } }, planner);
  assert.deepEqual(calls, [{}, { legacyValue: ' Storico ' }, { reset: true }, { reset: true }]);
});

test('request adapter rejects mixed legacy/canonical and malformed additive input', async () => {
  const planner = { plan: async () => ({ action: 'no_change' as const }) };
  await assert.rejects(
    () => planProfilePrimarySportRequest({ sport: 'Calcio', primarySport: { reset: true } }, planner),
    (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'conflicting_input',
  );
  await assert.rejects(
    () => planProfilePrimarySportRequest({ primarySport: 'Calcio' }, planner),
    (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'invalid_input',
  );
  await assert.rejects(
    () => planProfilePrimarySportRequest({ primarySport: {} }, planner),
    (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'invalid_input',
  );
});

test('current web client supports mutually exclusive canonical and legacy payloads', () => {
  assert.match(form, /<ClubRegistrationsSection countryId={residenceCountryId} \/>/);
  assert.match(form, /sport: \(athleteSport \|\| ''\)\.trim\(\) \|\| null/);
  assert.match(form, /delete basePayload\.sport;\s*Object\.assign\(basePayload, buildCanonicalSportRequestFields\(primarySport\)\)/s);
  assert.match(form, /normalizedPastExperiences\.map\(buildExperienceFormPayload\)/);
  assert.match(form, /fetch\('\/api\/profiles\/me', \{\s*method: 'PATCH'/s);
});

test('existing Phase 1 and 5C migrations do not add canonical Profile sport columns', () => {
  for (const migration of [foundation, phase5c]) {
    assert.doesNotMatch(migration, /alter table(?: if exists)? public\.profiles[\s\S]*sport_(?:discipline|variant)_id/i);
  }
});

test('local runtime fixture names all nine Production Profile triggers', () => {
  for (const trigger of [
    'enforce_single_platform_admin_profile', 'profiles_notify_draft_demotion',
    'profiles_set_visibility_status', 'profiles_sync_names', 'set_updated_at',
    'trg_profile_location_coerce', 'trg_profiles_fill_default_role',
    'trg_profiles_fill_role_for_fan', 'trg_profiles_updated_at',
  ]) assert.ok(
    productionTriggerFixture.includes(trigger) || versionedTriggerFixture.includes(trigger),
    `missing trigger compatibility coverage: ${trigger}`,
  );
  assert.match(productionTriggerFixture, /bodies are intentionally minimal/i);
});
