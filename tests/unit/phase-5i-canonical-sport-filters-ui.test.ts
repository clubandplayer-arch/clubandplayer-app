import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = readFileSync('app/api/sports/catalog/route.ts', 'utf8');
const selector = readFileSync('components/sports/CanonicalSportFilter.tsx', 'utf8');
const search = readFileSync('app/search/page.tsx', 'utf8');
const opportunities = readFileSync('app/(dashboard)/opportunities/OpportunitiesClient.tsx', 'utf8');
const opportunityForm = readFileSync('components/opportunities/OpportunityForm.tsx', 'utf8');
const profileForm = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const pastExperiences = readFileSync('lib/profiles/pastExperiences.ts', 'utf8');

test('5I catalog and selector expose an active hierarchical read-only vocabulary', () => {
  for (const table of ['sports', 'sport_disciplines', 'sport_variants', 'legacy_sport_mappings']) {
    assert.match(catalog, new RegExp(`from\\('${table}'\\)`));
  }
  assert.equal((catalog.match(/\.eq\('is_active', true\)/g) ?? []).length, 4);
  assert.doesNotMatch(catalog, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.match(selector, /item\.sport_id === value\.sportId/);
  assert.match(selector, /item\.discipline_id === value\.disciplineId/);
  assert.match(catalog, /legacy_display_label,sport_id,discipline_id,variant_id/);
  assert.match(catalog, /legacySportOrder/);
  assert.match(selector, /catalog\.legacySports/);
  assert.match(selector, /disciplineId: legacySport\?\.disciplineId \?\? ''/);
  assert.match(selector, /variantId: legacySport\?\.variantId \?\? ''/);
  assert.match(selector, /disciplineId,\s*variantId: ''/);
});

test('Profile, Experience, and Opportunity forms submit canonical context with legacy compatibility', () => {
  for (const source of [opportunityForm, profileForm]) {
    assert.match(source, /CanonicalSportFilter/);
    assert.match(source, /primarySport/);
    assert.match(source, /disciplineId/);
    assert.match(source, /variantId/);
  }
  assert.match(profileForm, /past-experience-\$\{index\}-sport/);
  assert.match(pastExperiences, /primarySport\?:/);
  assert.match(pastExperiences, /sportId: input\.primarySport\.sportId/);
  assert.match(opportunityForm, /buildCanonicalSportRequestFields\(primarySport\)/);
  assert.match(profileForm, /normalizedPastExperiences\.map\(buildExperienceFormPayload\)/);
});

test('canonical selector labels are localized in every supported locale', () => {
  for (const locale of ['it', 'en', 'fr', 'es']) {
    const messages = readFileSync(`lib/i18n/messages/${locale}.ts`, 'utf8');
    for (const key of ['sports.discipline', 'sports.allDisciplines', 'sports.variant', 'sports.allVariants', 'sports.catalogUnavailable']) {
      assert.match(messages, new RegExp(`['"]${key.replace('.', '\\.')}['"]`));
    }
  }
});

test('Search and Opportunities emit canonical IDs while retaining the legacy compatibility value', () => {
  for (const source of [search, opportunities]) {
    assert.match(source, /CanonicalSportFilter/);
    assert.match(source, /sportId/);
    assert.match(source, /disciplineId/);
    assert.match(source, /variantId/);
    assert.match(source, /legacySport/);
  }
  assert.match(opportunities, /p\.set\('sportId', value\.sportId\)/);
  assert.match(opportunities, /p\.set\('disciplineId', value\.disciplineId\)/);
  assert.match(opportunities, /p\.set\('variantId', value\.variantId\)/);
});
