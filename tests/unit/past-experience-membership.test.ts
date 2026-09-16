import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  isPastExperienceComplete,
  sanitizePastExperience,
} from '../../lib/profiles/pastExperiences';

test('past experiences allow the explicit no-membership fallback', () => {
  const experience = sanitizePastExperience({
    season: '2025/26',
    club: 'ASD Example',
    sport: 'Calcio',
    countryId: 'country-id',
    role: 'Portiere',
    category: 'Serie D',
  });
  assert.equal(isPastExperienceComplete(experience), true);
  assert.equal(isPastExperienceComplete({
    ...experience,
    organizationId: 'organization-id',
  }), false);
  assert.equal(isPastExperienceComplete({
    ...experience,
    organizationId: 'organization-id',
    categoryId: 'category-id',
  }), true);
});

test('past experience editor follows Sport, country, organization, category, role order', () => {
  const form = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
  const section = form.slice(form.indexOf("t('profile.pastExperiences')"), form.indexOf('{/* Zona di interesse'));
  const sport = section.indexOf('<CanonicalSportFilter');
  const country = section.indexOf('<CanonicalCountrySelect');
  const membership = section.indexOf('<OrganizationCategoryFields');
  const role = section.indexOf("t('profile.role')");
  assert.ok(sport >= 0 && sport < country && country < membership && membership < role);
  assert.doesNotMatch(section, /getPastExperienceCategoriesBySport/);
});

test('experience API validates and persists canonical memberships', () => {
  const route = readFileSync('app/api/profiles/me/experiences/route.ts', 'utf8');
  const migration = readFileSync('supabase/migrations/20261217120000_athlete_experience_organization_membership.sql', 'utf8');
  const countryMigration = readFileSync('supabase/migrations/20261218120000_past_experience_country_and_retire_individual_sports.sql', 'utf8');
  assert.match(route, /validateOrganizationMembership/);
  assert.match(route, /if \(normalized\.organizationId && normalized\.categoryId\)/);
  assert.match(route, /sports_organization_id: canonicalExperience\.organizationId \|\| null/);
  assert.match(route, /sports_organization_id/);
  assert.match(route, /sports_organization_category_id/);
  assert.match(route, /country_id: canonicalExperience\.countryId/);
  assert.match(migration, /invalid experience organization membership/);
  assert.match(migration, /x\.sports_organization_id is not null and c\.id is null/);
  assert.match(countryMigration, /c\.country_id = x\.country_id/);
  assert.match(countryMigration, /where code in \('skiing','biathlon'\)/);
});
