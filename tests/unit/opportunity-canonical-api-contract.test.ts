import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const collection = readFileSync('app/api/opportunities/route.ts', 'utf8');
const item = readFileSync('app/api/opportunities/[id]/route.ts', 'utf8');
const mine = readFileSync('app/api/applications/me/route.ts', 'utf8');
const received = readFileSync('app/api/applications/received/route.ts', 'utf8');

test('canonical Opportunity filters take precedence and legacy sport remains a fallback', () => {
  assert.match(collection, /applyCanonicalSportFilters/);
  assert.match(collection, /disciplineId: disciplineId \|\| null/);
  assert.match(collection, /variantId: variantId \|\| null/);
  assert.match(collection, /sport,\s*\);/);
  for (const column of ['sport_discipline_id', 'sport_variant_id', 'player_position_id', 'staff_role_id', 'gender_code']) {
    assert.match(collection, new RegExp(`query\\.eq\\('${column}'`));
  }
});

test('Opportunity writes use one row mutation after canonical planning', () => {
  assert.ok(collection.indexOf('planProfilePrimarySportRequest') < collection.indexOf(".insert(payload)"));
  assert.ok(item.indexOf('planProfilePrimarySportRequest') < item.indexOf('.update(update)'));
  assert.match(item, /Object\.assign\(update, await resolveOpportunityRoleColumns/);
  assert.match(item, /roleGroup: nextRoleGroup/);
});

test('Opportunity writes preserve legacy gender while using 5D-C canonical gender codes', () => {
  for (const route of [collection, item]) {
    assert.match(route, /toOpportunityDbValue\(normalized, 'canonical'\)/);
    assert.match(route, /toOpportunityDbValue\(normalized, 'fallback'\)/);
  }
  assert.match(collection, /gender:\s*genderDb,[\s\S]*gender_code:\s*genderCode/);
  assert.match(item, /update\.gender = genderDb;\s*update\.gender_code = genderCode;/);
});

test('Application reads keep existing owner scopes and only inherit Opportunity context', () => {
  assert.match(mine, /\.eq\('athlete_id', user\.id\)/);
  assert.match(received, /\.or\(`owner_id\.eq\.\$\{user\.id\},created_by\.eq\.\$\{user\.id\}`\)/);
  assert.match(mine, /projectOpportunityCanonicalContext/);
  assert.match(received, /projectOpportunityCanonicalContext/);
  assert.doesNotMatch(mine, /\.update\(|\.insert\(|\.delete\(/);
  assert.doesNotMatch(received, /\.update\(|\.insert\(|\.delete\(/);
});
