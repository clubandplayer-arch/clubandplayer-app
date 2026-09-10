import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const catalog = readFileSync('app/api/sports/catalog/route.ts', 'utf8');
const selector = readFileSync('components/sports/CanonicalSportFilter.tsx', 'utf8');
const search = readFileSync('app/search/page.tsx', 'utf8');
const opportunities = readFileSync('app/(dashboard)/opportunities/OpportunitiesClient.tsx', 'utf8');

test('5I catalog and selector expose an active hierarchical read-only vocabulary', () => {
  for (const table of ['sports', 'sport_disciplines', 'sport_variants']) {
    assert.match(catalog, new RegExp(`from\\('${table}'\\)`));
  }
  assert.equal((catalog.match(/\.eq\('is_active', true\)/g) ?? []).length, 3);
  assert.doesNotMatch(catalog, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.match(selector, /item\.sport_id === value\.sportId/);
  assert.match(selector, /item\.discipline_id === value\.disciplineId/);
  assert.match(selector, /disciplineId: '', variantId: ''/);
  assert.match(selector, /disciplineId: event\.target\.value, variantId: ''/);
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
