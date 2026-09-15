import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SPORTS, SPORTS_ROLES, sportRequiresPlayerRole } from '../../lib/opps/constants';
import { CATEGORIES_BY_SPORT } from '../../lib/opps/categories';
import { resolveSportTaxonomy } from '../../lib/taxonomy/legacyMappings';

const expected = ['Calcio','Calcio a 8','Calcio a 7','Futsal','Volley','Basket','Pallanuoto','Pallamano','Rugby','Hockey su prato','Hockey su ghiaccio','Baseball','Softball','Lacrosse','Football americano'];
const sql = readFileSync('supabase/migrations/20261211120000_add_seven_a_side_football_variant.sql','utf8');

test('sport selector keeps the exact 15-option order and usable C7 dependencies', () => {
  assert.deepEqual(SPORTS, expected);
  assert.ok(SPORTS_ROLES['Calcio a 7'].length > 0);
  assert.ok(CATEGORIES_BY_SPORT['Calcio a 7'].length > 0);
  assert.equal(sportRequiresPlayerRole('Calcio a 7'), true);
});

test('Calcio a 7 resolves independently and additive SQL derives database ids', () => {
  const value = resolveSportTaxonomy('Calcio a 7');
  assert.equal(value.variant?.code, 'seven_a_side');
  assert.equal(value.variant?.teamSize, 7);
  assert.match(sql, /'calcio_a_7'/);
  assert.match(sql, /join public\.sport_variants/);
  assert.doesNotMatch(sql, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  assert.match(sql, /insert into public\.player_position_applicability/);
  assert.match(sql, /variants\.code = 'seven_a_side'/);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from) public\.(?:profiles|opportunities|applications|sports_organizations|competitions)/i);
});

test('C7 competition labels are not copied from C8', () => {
  const c7 = new Set(CATEGORIES_BY_SPORT['Calcio a 7']);
  for (const level of ['Serie A','Serie A2','Serie B']) assert.equal(c7.has(level), false);
  assert.deepEqual([...c7], ['Altro']);
});
