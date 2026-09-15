import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profileRoute = readFileSync('app/api/profiles/me/route.ts', 'utf8');
const profileMiniCard = readFileSync('components/profiles/ProfileMiniCard.tsx', 'utf8');

test('the feed Club card gets sport and category from the active primary registration', () => {
  assert.match(profileRoute, /from\('club_sport_registrations'\)/);
  assert.match(profileRoute, /eq\('is_active', true\)/);
  assert.match(profileRoute, /eq\('is_primary', true\)/);
  assert.match(profileRoute, /data\.sport = sport\?\.code/);
  assert.match(profileRoute, /data\.club_league_category = category\?\.canonical_name/);
});

test('the feed Club card localizes the canonical primary category', () => {
  assert.match(
    profileMiniCard,
    /localizeOpportunityCategory\(p\.club_league_category, t\)/,
  );
});

test('the feed Club card localizes the canonical primary sport', () => {
  assert.match(
    profileMiniCard,
    /localizeSport\(normalizeSport\(p\?\.sport \?\? null\), t\)/,
  );
});
