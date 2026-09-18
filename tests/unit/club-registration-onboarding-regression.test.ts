import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('login and role onboarding cannot send an incomplete Club to the feed', () => {
  const middleware = readFileSync('middleware.ts', 'utf8');
  assert.match(middleware, /!profileComplete\s*\? completionPath\s*:\s*'\/feed'/);
  assert.match(middleware, /profileComplete \? '\/feed' : completionPath/);
});

test('whoami completes Clubs from canonical geography and active registrations', () => {
  const route = readFileSync('app/api/auth/whoami/route.ts', 'utf8');
  assert.match(route, /profile_preferences/);
  assert.match(route, /club_sport_registrations/);
  assert.match(route, /has_active_club_registration/);
});

test('feed cards never use an auth user id as a public profile id', () => {
  for (const path of ['components/feed/PostCard.tsx', 'components/feed/ReadOnlyPostCard.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /authorProfile\?\.id \?\? post\.author_profile_id \?\? post\.authorId/);
    assert.match(source, /authorProfile\?\.id \?\? post\.author_profile_id \?\? null/);
  }
});

test('public Club readers trust the relational publication contract', () => {
  const page = readFileSync('app/(dashboard)/clubs/[id]/page.tsx', 'utf8');
  const map = readFileSync('app/api/search/map/route.ts', 'utf8');
  assert.doesNotMatch(page, /isProfileComplete\(profileState\)/);
  assert.match(map, /row\.account_type !== 'club' && !isProfileComplete\(row\)/);
});

test('database publication follows geography and registration lifecycle', () => {
  const migration = readFileSync(
    'supabase/migrations/20261217120000_align_club_onboarding_publication.sql',
    'utf8',
  );
  assert.match(migration, /has_active_registration/);
  assert.match(migration, /has_canonical_location/);
  assert.match(migration, /after insert or update or delete on public\.club_sport_registrations/);
  assert.match(migration, /profile_preferences_refresh_club_publication/);
  assert.match(migration, /update public\.profiles[\s\S]*account_type, type/);
});
