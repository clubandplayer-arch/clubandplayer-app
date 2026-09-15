import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { clubHonorSeasonOptions, isClubHonorSeasonAvailable } from '../../lib/clubs/honorSeasons';

const migration = readFileSync('supabase/migrations/20261216120000_club_honors.sql', 'utf8');
const profile = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const publicPage = readFileSync('app/(dashboard)/clubs/[id]/page.tsx', 'utf8');
const countryMigration = readFileSync('supabase/migrations/20261220120000_club_honors_country_coherence.sql', 'utf8');

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
  assert.match(countryMigration, /c\.country_id = pp\.residence_country_id/);
});

test('honors are directly after registrations in private and public profiles', () => {
  assert.ok(profile.indexOf('<ClubRegistrationsSection countryId={residenceCountryId} />') < profile.indexOf('<ClubHonorsSection countryId={residenceCountryId} />'));
  assert.ok(profile.indexOf('<ClubHonorsSection countryId={residenceCountryId} />') < profile.indexOf('{/* Social */}'));
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
    assert.match(route, /residence_country_id/);
    assert.match(route, /countryId:/);
  }
});

test('season menu rolls over every July 1 and is newest first', () => {
  assert.deepEqual(clubHonorSeasonOptions(new Date(2026, 5, 30), 2022), ['2024/2025', '2023/2024', '2022/2023']);
  assert.deepEqual(clubHonorSeasonOptions(new Date(2026, 6, 1), 2022), ['2025/2026', '2024/2025', '2023/2024', '2022/2023']);
  assert.equal(isClubHonorSeasonAvailable('2025/2026', new Date(2026, 6, 1)), true);
  assert.equal(isClubHonorSeasonAvailable('2026/2027', new Date(2026, 6, 1)), false);
});

test('the UI uses a season select, keeps Giovanili last and labels first place only Campione', () => {
  const ui = readFileSync('components/clubs/ClubHonorsSection.tsx', 'utf8');
  const categories = readFileSync('components/sports/OrganizationCategoryFields.tsx', 'utf8');
  const italian = readFileSync('lib/i18n/messages/operations/it.ts', 'utf8');
  assert.match(ui, /seasonOptions\.map/);
  assert.match(ui, /OrganizationCategoryFields countryId=\{countryId\}/);
  assert.doesNotMatch(ui, /placeholder="2025\/2026"/);
  assert.match(categories, /canonical_name === 'Giovanili'/);
  assert.match(italian, /'club\.honors\.champion':'Campione'/);
  assert.doesNotMatch(italian, /Campione · 1° posto/);
});

test('private and public honors reads are chronological and stable', () => {
  for (const path of ['app/api/clubs/honors/route.ts', 'app/api/clubs/[id]/honors/route.ts', 'app/(dashboard)/clubs/[id]/page.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /order\('season', \{ ascending: false \}\)\.order\('placement'\)\.order\('created_at'\)\.order\('id'\)/);
  }
});
