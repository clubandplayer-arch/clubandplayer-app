import assert from 'node:assert/strict';
import test from 'node:test';

import { applyPublicProfileVisibilityFilters } from '../../lib/profile/visibility';

test('central public-profile scope requires active and published records', () => {
  const filters: Array<[string, unknown]> = [];
  const query = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return this;
    },
  };

  const result = applyPublicProfileVisibilityFilters(query);

  assert.equal(result, query);
  assert.deepEqual(filters, [
    ['status', 'active'],
    ['profile_visibility_status', 'published'],
  ]);
});
