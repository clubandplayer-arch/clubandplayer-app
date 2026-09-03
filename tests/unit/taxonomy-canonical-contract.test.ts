import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_ENTITY_KINDS,
  CANONICAL_READ_PRECEDENCE,
  COMPATIBILITY_RULES,
  LEGACY_API_FIELDS_FROZEN_FOR_MOBILE,
  RELATION_RULES,
  selectCompatibilityReadSource,
  validateCanonicalTuple,
} from '../../lib/taxonomy/canonicalContract';

test('5B contract covers every roadmap entity without treating labels as identity', () => {
  for (const entity of [
    'sport', 'discipline', 'variant', 'sports_organization', 'competition',
    'competition_level', 'competition_group', 'age_class', 'gender_class',
    'season', 'competition_format', 'player_role', 'staff_role',
  ]) assert.ok(CANONICAL_ENTITY_KINDS.includes(entity as never), entity);

  assert.equal(COMPATIBILITY_RULES.labelsArePresentationOnly, true);
  assert.equal(RELATION_RULES.competitionIdentityIsNotItsLabel, true);
  assert.equal(RELATION_RULES.seasonUsesDateBoundariesNotLabelIdentity, true);
});

test('5B canonical tuple fails closed for orphan discipline and variant references', () => {
  assert.deepEqual(validateCanonicalTuple({ sportId: null, disciplineId: 'd', variantId: null }), [
    'discipline_requires_sport',
  ]);
  assert.deepEqual(validateCanonicalTuple({ sportId: 's', disciplineId: null, variantId: 'v' }), [
    'variant_requires_discipline',
  ]);
  assert.deepEqual(validateCanonicalTuple({ sportId: 's', disciplineId: 'd', variantId: 'v' }), []);
  assert.deepEqual(validateCanonicalTuple({ sportId: 's', disciplineId: null, variantId: null }), []);
});

test('5B compatibility remains canonical-first and preserves unknown raw legacy values', () => {
  assert.deepEqual(CANONICAL_READ_PRECEDENCE, ['canonical', 'mapped_legacy', 'raw_legacy', 'empty']);
  assert.equal(selectCompatibilityReadSource({ canonical: { id: 'id', code: 'football' }, mappedLegacy: null, legacyValue: 'Calcio' }), 'canonical');
  assert.equal(selectCompatibilityReadSource({ canonical: null, mappedLegacy: { id: 'id', code: 'football' }, legacyValue: 'Calcio' }), 'mapped_legacy');
  assert.equal(selectCompatibilityReadSource({ canonical: null, mappedLegacy: null, legacyValue: 'Sport storico' }), 'raw_legacy');
  assert.equal(selectCompatibilityReadSource({ canonical: null, mappedLegacy: null, legacyValue: '  ' }), 'empty');
  assert.equal(COMPATIBILITY_RULES.unknownLegacyValuesRemainReadable, true);
  assert.equal(COMPATIBILITY_RULES.noAutomaticUserDataBackfill, true);
});

test('5B freezes current legacy Mobile-facing fields and keeps Staff cross-sport', () => {
  assert.deepEqual(LEGACY_API_FIELDS_FROZEN_FOR_MOBILE.profiles, [
    'sport', 'role', 'gender', 'club_league_category',
  ]);
  assert.ok(LEGACY_API_FIELDS_FROZEN_FOR_MOBILE.opportunities.includes('required_category'));
  assert.ok(LEGACY_API_FIELDS_FROZEN_FOR_MOBILE.athlete_experiences.includes('start_year'));
  assert.equal(COMPATIBILITY_RULES.legacyFieldsRemainAcceptedAndReturned, true);
  assert.equal(COMPATIBILITY_RULES.mobileParityIsSeparate, true);
  assert.equal(RELATION_RULES.staffRoleIsCrossSportByDefault, true);
  assert.equal(RELATION_RULES.playerRoleRequiresSportCompatibility, true);
});

test('5B separates age class, competition level, season and country-aware scope', () => {
  assert.equal(RELATION_RULES.ageClassIsNotCompetitionLevel, true);
  assert.equal(RELATION_RULES.competitionRequiresOrganization, true);
  assert.equal(RELATION_RULES.competitionGroupRequiresCompetitionAndSeason, true);
  assert.equal(RELATION_RULES.territorialScopeIsCountryAware, true);
  assert.equal(RELATION_RULES.profileSupportsOrderedMultiSportWithOptionalPrimary, true);
});
