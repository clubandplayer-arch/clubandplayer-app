import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync('components/opportunities/OpportunityForm.tsx', 'utf8');
const registrations = readFileSync('app/api/clubs/registrations/route.ts', 'utf8');
const opportunityItem = readFileSync('app/api/opportunities/[id]/route.ts', 'utf8');

test('registration choices retain the legacy label for their complete canonical chain', () => {
  assert.match(registrations, /legacy_sport_mappings/);
  assert.match(registrations, /mapping\.discipline_id/);
  assert.match(registrations, /registration\.sport_discipline_id/);
  assert.match(registrations, /mapping\.variant_id/);
  assert.match(registrations, /registration\.sport_variant_id/);
  assert.match(registrations, /legacy_sport:/);
  assert.match(form, /const legacySport=r\.legacy_sport/);
  assert.match(form, /setSport\(legacySport\)/);
});

test('PATCH compares a requested registration with every resulting snapshot field', () => {
  assert.match(opportunityItem, /requestedRegistrationId/);
  for (const column of [
    'sport_id',
    'sport_discipline_id',
    'sport_variant_id',
    'sports_organization_id',
    'sports_organization_category_id',
  ]) {
    assert.match(opportunityItem, new RegExp(`registration\\.${column}[\\s\\S]{0,120}resultingValue\\('${column}'\\)`));
  }
  assert.ok(opportunityItem.indexOf('const tupleMatches') < opportunityItem.indexOf('.update(update)'));
});
