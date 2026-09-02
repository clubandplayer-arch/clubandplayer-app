import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { mapResultWindow, PUBLIC_MAP_LIMITS, PUBLIC_MAP_PROVIDER } from '../../lib/maps/publicMapPolicy';

test('E7 provider policy is pinned, attributed and shared by ClubMap', () => {
  assert.equal(PUBLIC_MAP_PROVIDER.leafletVersion, '1.9.4');
  assert.match(PUBLIC_MAP_PROVIDER.leafletScript, /leaflet@1\.9\.4/);
  assert.match(PUBLIC_MAP_PROVIDER.attribution, /OpenStreetMap/);
  const client = readFileSync('app/(dashboard)/club-map/ClubMapClient.tsx', 'utf8');
  assert.match(client, /PUBLIC_MAP_PROVIDER\.leafletCss/);
  assert.match(client, /PUBLIC_MAP_PROVIDER\.leafletScript/);
  assert.match(client, /PUBLIC_MAP_PROVIDER\.tileUrl/);
});

test('E7 result windows expose truncation without exceeding public caps', () => {
  assert.deepEqual(mapResultWindow([1, 2, 3], 2), { rows: [1, 2], truncated: true });
  assert.deepEqual(mapResultWindow([1, 2], 2), { rows: [1, 2], truncated: false });
  assert.equal(PUBLIC_MAP_LIMITS.boundedClubs < PUBLIC_MAP_LIMITS.globalClubs, true);
  assert.equal(PUBLIC_MAP_LIMITS.searchOwnerPool <= PUBLIC_MAP_LIMITS.boundedClubs, true);
});

test('E7 endpoint responses disclose limits and keep bounded owner pools', () => {
  const clubs = readFileSync('app/api/clubs/geolocated/route.ts', 'utf8');
  const searchMap = readFileSync('app/api/search/map/route.ts', 'utf8');
  assert.match(clubs, /limit\(resultLimit \+ 1\)/);
  assert.match(clubs, /meta: \{ limit: resultLimit, returned: rows\.length, truncated \}/);
  assert.match(searchMap, /PUBLIC_MAP_LIMITS\.searchOwnerPool/);
  assert.match(searchMap, /PUBLIC_MAP_LIMITS\.opportunities/);
  assert.doesNotMatch(searchMap, /fallbackQuery/);
});

test('E7 preserves privacy, canonical filtering and backward-compatible routing', () => {
  const searchMap = readFileSync('app/api/search/map/route.ts', 'utf8');
  const clubs = readFileSync('app/api/clubs/geolocated/route.ts', 'utf8');
  const redirect = readFileSync('app/(dashboard)/search-map/page.tsx', 'utf8');
  assert.match(searchMap, /precise_personal_map_points_disabled/);
  assert.match(searchMap, /opportunity_owner_public_point_v1/);
  assert.match(clubs, /applyPublicProfileVisibilityFilters/);
  assert.match(clubs, /resolveCanonicalMapLocationScope/);
  assert.match(redirect, /redirect\('\/club-map'\)/);
});
