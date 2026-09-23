import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const suggestionsRoute = readFileSync('app/api/follows/suggestions/route.ts', 'utf8');
const playerPage = readFileSync('app/(dashboard)/players/[id]/page.tsx', 'utf8');
const rosterButton = readFileSync('components/clubs/ClubRosterToggleButton.tsx', 'utf8');

test('my-sport discovery requires both the exact canonical tuple and selected sport label', () => {
  assert.match(suggestionsRoute, /applyExactCanonicalSportFilters/);
  assert.match(suggestionsRoute, /canonicalQuery\.ilike\('sport', escapeLike\(profile\.sport\.trim\(\)\)\)/);
  assert.doesNotMatch(suggestionsRoute, /`%\$\{escapeLike\(profile\.sport\.trim\(\)\)\}%`/);
  assert.match(suggestionsRoute, /sportScope === 'mine'[\s\S]*q\.eq\('id', '00000000-0000-0000-0000-000000000000'\)/);
});

test('clubs can manage player roster membership from a public player profile', () => {
  assert.match(playerPage, /viewerRole === 'club' && viewedAccountType !== 'staff' && !isMe/);
  assert.match(playerPage, /ClubRosterToggleButton playerProfileId=\{profile\.id\}/);
  assert.match(rosterButton, /fetch\('\/api\/clubs\/me\/roster'/);
  assert.match(rosterButton, /t\('roster\.add'\)/);
});
