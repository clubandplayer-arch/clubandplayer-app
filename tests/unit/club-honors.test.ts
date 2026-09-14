import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20261216120000_club_honors.sql', 'utf8');
const profile = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const publicPage = readFileSync('app/(dashboard)/clubs/[id]/page.tsx', 'utf8');

test('honors schema permits different competitions and placements in one season', () => {
  assert.match(migration, /create table public\.club_honors/);
  assert.match(migration, /season text not null/);
  assert.match(migration, /placement in \(1, 2, 3\)/);
  assert.match(migration, /club_honors_active_competition_unique/);
  assert.match(migration, /club_profile_id, season, sport_id/);
  assert.doesNotMatch(migration, /unique[^;]*placement/);
});

test('honors enforce catalog compatibility, ownership and public active reads', () => {
  assert.match(migration, /incompatible_club_honor/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /p\.user_id = auth\.uid\(\)/);
  assert.match(migration, /is_active or exists/);
});

test('honors are directly after registrations in private and public profiles', () => {
  assert.ok(profile.indexOf('<ClubRegistrationsSection />') < profile.indexOf('<ClubHonorsSection />'));
  assert.ok(profile.indexOf('<ClubHonorsSection />') < profile.indexOf('{/* Social */}'));
  const registrations = publicPage.indexOf("t('club.registrations.title')", publicPage.indexOf("t('club.data')"));
  const honors = publicPage.indexOf("t('club.honors.title')", registrations);
  const biography = publicPage.indexOf("t('club.biography')", honors);
  assert.ok(registrations < honors && honors < biography);
});

test('honor APIs validate canonical membership and owner scope', () => {
  for (const path of ['app/api/clubs/honors/route.ts', 'app/api/clubs/honors/[id]/route.ts']) {
    const route = readFileSync(path, 'utf8');
    assert.match(route, /validateOrganizationMembership/);
    assert.match(route, /club_profile_id/);
  }
});
