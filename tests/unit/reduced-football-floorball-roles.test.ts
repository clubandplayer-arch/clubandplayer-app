import assert from 'node:assert/strict';
import test from 'node:test';

import { SPORTS, SPORTS_ROLES, sportRequiresPlayerRole } from '../../lib/opps/constants';
import { readFileSync } from 'node:fs';

test('orders reduced football before futsal and floorball after the existing team sports', () => {
  const ordered = ['Calcio a 8', 'Calcio a 7', 'Calcio a 6', 'Futsal'];
  assert.deepEqual(SPORTS.slice(SPORTS.indexOf('Calcio a 8'), SPORTS.indexOf('Futsal') + 1), ordered);
  assert.equal(SPORTS.at(-1), 'Floorball');
  for (const removed of ['Sci', 'Biathlon', 'Tennis']) assert.ok(!SPORTS.includes(removed));
});

test('retires Tennis from persisted catalogues without deleting historical rows', () => {
  const migration = readFileSync('supabase/migrations/20261219120000_retire_tennis_from_selectable_sports.sql', 'utf8');
  assert.match(migration, /normalized_source_value='tennis'/);
  assert.match(migration, /s\.code='tennis'/);
  assert.match(migration, /where code='tennis'/);
  assert.doesNotMatch(migration, /delete from/);
});

test('provides dedicated selectable roles for reduced football and floorball', () => {
  assert.deepEqual(SPORTS_ROLES['Calcio a 7'], ['Portiere','Difensore','Centrocampista','Esterno offensivo/Ala','Attaccante']);
  assert.deepEqual(SPORTS_ROLES['Calcio a 6'], ['Portiere','Difensore','Centrocampista','Esterno offensivo/Ala','Attaccante']);
  assert.deepEqual(SPORTS_ROLES.Floorball, ['Portiere','Difensore','Centro','Ala','Attaccante']);
  for (const sport of ['Calcio a 7', 'Calcio a 6', 'Floorball']) assert.equal(sportRequiresPlayerRole(sport), true);
});
