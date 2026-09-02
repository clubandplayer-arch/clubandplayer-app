import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const liveLinks = [
  'components/messaging/DirectMessageInbox.tsx',
  'components/onboarding/FirstStepsCard.tsx',
  'components/layout/LegalNavbar.tsx',
  'components/feed/TrendingTopics.tsx',
  'components/feed/FeedClient.tsx',
];

test('E5 keeps old search-map bookmarks compatible while routing to ClubMap', () => {
  const page = readFileSync('app/(dashboard)/search-map/page.tsx', 'utf8');
  assert.match(page, /redirect\('\/club-map'\)/);
});

test('E5 removes all live links to the obsolete SearchMap UI', () => {
  for (const path of liveLinks) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /href:\s*['"]\/search-map|href=['"]\/search-map/);
    assert.match(source, /\/club-map/);
  }
});

test('E5 removes the unreachable unsafe client and its private client service', () => {
  assert.equal(existsSync('app/(dashboard)/search-map/SearchMapClient.tsx'), false);
  assert.equal(existsSync('components/search/SearchResultsList.tsx'), false);
  assert.equal(existsSync('lib/services/search.ts'), false);
});

test('E5 preserves server endpoints for later Opportunity semantics without activating personal pins', () => {
  const route = readFileSync('app/api/search/map/route.ts', 'utf8');
  assert.match(route, /precise_personal_map_points_disabled/);
  assert.match(route, /resolvePublicMapPoint/);
});
