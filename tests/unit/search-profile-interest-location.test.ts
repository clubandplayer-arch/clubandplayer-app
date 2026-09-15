import assert from 'node:assert/strict';
import test from 'node:test';

import { loadProfileSearchInterestLocations } from '../../lib/search/profileResultLocation.server';

test('search profile locations use the first canonical area of interest', async () => {
  const query = {
    select() { return this; },
    in() { return this; },
    async order() {
      return {
        data: [
          { profile_id: 'player-1', priority: 1, area: { official_name: 'Carlentini', country: { iso2: 'IT', official_name: 'Italy' } } },
          { profile_id: 'player-1', priority: 2, area: { official_name: 'Siracusa', country: { iso2: 'IT', official_name: 'Italy' } } },
        ],
        error: null,
      };
    },
  };
  const client = { from: () => query };

  const locations = await loadProfileSearchInterestLocations(client as never, ['player-1']);

  assert.equal(locations.get('player-1'), 'Carlentini · Italy');
});

test('search remains available when canonical interests cannot be loaded', async () => {
  const query = {
    select() { return this; },
    in() { return this; },
    async order() { return { data: null, error: new Error('table unavailable') }; },
  };
  const client = { from: () => query };

  assert.deepEqual(await loadProfileSearchInterestLocations(client as never, ['staff-1']), new Map());
});
