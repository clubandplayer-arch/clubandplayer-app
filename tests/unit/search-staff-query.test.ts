import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync('app/api/search/route.ts', 'utf8');
const staffQuery = route.slice(
  route.indexOf('function buildStaffQuery('),
  route.indexOf('async function fetchProfileResults('),
);

test('staff search uses public visibility without excluding published profiles missing optional fields', () => {
  assert.match(staffQuery, /applyPublicProfileVisibilityFilters/);
  assert.match(staffQuery, /account_type\.eq\.staff,type\.eq\.staff/);
  assert.match(staffQuery, /full_name\.ilike/);
  assert.doesNotMatch(staffQuery, /\.not\(['"]display_name['"]/);
  assert.doesNotMatch(staffQuery, /\.not\(['"]bio['"]/);
});

test('staff result and count queries share the same filtering contract', () => {
  const usages = route.match(/buildStaffQuery\(/g) ?? [];
  assert.equal(usages.length, 3);
  assert.match(staffQuery, /applyCommonFilters\(query, filters/);
  assert.match(staffQuery, /allowSport: true/);
  assert.match(staffQuery, /allowRole: true/);
});
