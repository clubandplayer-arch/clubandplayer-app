import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeForeignCity } from '../../components/profiles/LocationFields';

test('normalizes the Italian Paris exonym before foreign free-text locations are saved', () => {
  assert.equal(normalizeForeignCity('FR', 'Parigi'), 'Paris');
  assert.equal(normalizeForeignCity('fr', ' parigi '), 'Paris');
  assert.equal(normalizeForeignCity('FR', 'Lyon'), 'Lyon');
});
