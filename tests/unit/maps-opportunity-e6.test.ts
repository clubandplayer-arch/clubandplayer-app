import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveOpportunityMapPlacement } from '../../lib/maps/geographyContract';

test('E6 prefers an explicit Opportunity venue when one becomes available', () => {
  assert.deepEqual(resolveOpportunityMapPlacement({
    explicitVenue: { latitude: 41.9, longitude: 12.5 },
    organizationPoint: { latitude: 45.4, longitude: 9.1 },
    canonicalGeoAreaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }), { latitude: 41.9, longitude: 12.5, source: 'opportunity_venue' });
});

test('E6 inherits only a validated public organization point', () => {
  assert.deepEqual(resolveOpportunityMapPlacement({
    explicitVenue: { latitude: null, longitude: null },
    organizationPoint: { latitude: 41.9, longitude: 12.5 },
    canonicalGeoAreaId: null,
  }), { latitude: 41.9, longitude: 12.5, source: 'organization_venue' });
});

test('E6 never converts canonical geography into an Opportunity pin', () => {
  assert.equal(resolveOpportunityMapPlacement({
    explicitVenue: { latitude: null, longitude: null },
    organizationPoint: null,
    canonicalGeoAreaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }), null);
});

test('E6 rejects incomplete or invalid inherited placement pairs', () => {
  assert.throws(() => resolveOpportunityMapPlacement({
    explicitVenue: { latitude: null, longitude: null },
    organizationPoint: { latitude: 91, longitude: 12.5 },
  }), /coordinate pair is not finite and in range/);
});
