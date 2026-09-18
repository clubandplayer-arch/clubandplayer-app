import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { writeMyClubGeography } from '../../lib/geo/clubGeographyWrite.server';

const route = readFileSync('app/api/profiles/me/residence/route.ts', 'utf8');
const auth = readFileSync('lib/api/auth.ts', 'utf8');
const form = readFileSync('components/profiles/ProfileEditForm.tsx', 'utf8');
const adapter = readFileSync('lib/geo/clubGeographyWrite.server.ts', 'utf8');

const COUNTRY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AREA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const patch = { kind: 'full' as const, residenceCountryId: COUNTRY_ID, residenceGeoAreaId: AREA_ID };

test('Club bypasses Player/Staff rollout gates but all roles remain authenticated and owner-derived', () => {
  assert.match(route, /export const (?:GET|PATCH) = withAuth/g);
  assert.match(route, /if \(!club && !isCanonicalProfileResidenceWriteEnabled\(\)\)/);
  assert.match(route, /if \(!club && !isCanonicalProfileResidenceWriteUserAllowed\(user\.id\)\)/);
  assert.match(route, /club\s*\? await writeMyClubGeography\(supabase, patch\)/);
  assert.doesNotMatch(route, /writeMyClubGeography\([^,]+,[^)]*(?:profile|user)(?:Id|\.id)/);
  assert.match(auth, /getSupabaseServerClientWithAccessToken\(bearerToken\)/);
});

test('GET and Web form expose Club canonical geography even when the Player/Staff UI gate is disabled', () => {
  assert.match(route, /if \(!club && !isCanonicalProfileResidenceUiEnabled\(\)\)/);
  assert.match(route, /enabled: club \|\| isCanonicalProfileResidenceUiEnabled\(\)/);
  assert.match(route, /writable: club \|\|/);
  assert.match(form, /p\.account_type === 'club' \|\| \(canonicalResidenceUiEnabled/);
  assert.match(form, /residenceWritable && \(isClub \|\|/);
});

test('Club writes call only the transactional RPC with the Mobile/Web payload contract', async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return { data: { profileId: 'owner-profile' }, error: null };
    },
  };

  const result = await writeMyClubGeography(client as never, patch);
  assert.equal(result.status, 'written');
  assert.deepEqual(calls, [{
    name: 'update_my_club_geography',
    args: { p_residence_country_id: COUNTRY_ID, p_residence_geo_area_id: AREA_ID },
  }]);
  assert.doesNotMatch(adapter, /\.from\(|insert\(|upsert\(|update\(/);
});

test('RPC failures propagate and never fall back to separate writes', async () => {
  const failure = new Error('transaction rolled back');
  const client = { rpc: async () => ({ data: null, error: failure }) };
  await assert.rejects(writeMyClubGeography(client as never, patch), failure);

  const invalidClient = { rpc: async () => ({ data: null, error: null }) };
  await assert.rejects(writeMyClubGeography(invalidClient as never, patch), /invalid result/);
});

test('the Web profile payload excludes Club geography before the RPC', () => {
  assert.match(form, /if \(isClub\) \{[\s\S]*delete basePayload\[field\]/);
  assert.match(form, /update_my_club_geography/);
});

test('saving Club geography closes stale registration editors and reloads the reconciled country catalog', () => {
  const registrations = readFileSync('components/clubs/ClubRegistrationsSection.tsx', 'utf8');
  assert.match(form, /setClubGeographyRevision\(\(revision\) => revision \+ 1\)/);
  assert.match(form, /geographyDirty=\{residenceDirty\} geographyRevision=\{clubGeographyRevision\}/);
  assert.match(registrations, /\[load, geographyRevision\]/);
  assert.match(registrations, /setOpen\(false\)/);
  assert.match(registrations, /disabled=\{geographyDirty\}/);
  assert.match(registrations, /club\.registrations\.geographyPending/);
  for (const locale of ['it', 'en', 'es', 'fr']) {
    assert.match(readFileSync(`lib/i18n/messages/operations/${locale}.ts`, 'utf8'), /club\.registrations\.geographyPending/);
  }
});

test('Club registration creation reactivates an archived identical membership instead of violating uniqueness', () => {
  const registrationsRoute = readFileSync('app/api/clubs/registrations/route.ts', 'utf8');
  assert.match(registrationsRoute, /\.upsert\(/);
  assert.match(registrationsRoute, /onConflict:'club_profile_id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id'/);
  assert.doesNotMatch(registrationsRoute, /\.insert\(\{\.\.\.b,club_profile_id:club\.id\}\)/);
});

test('feed Club mini-card prefers canonical residence over stale legacy location fields', () => {
  const miniCard = readFileSync('components/profiles/ProfileMiniCard.tsx', 'utf8');
  assert.match(miniCard, /fetch\('\/api\/profiles\/me\/residence'/);
  assert.match(miniCard, /residence\.residenceGeoAreaId/);
  assert.match(miniCard, /canonicalClubResidenceLabel \|\| interestLabel/);
});

test('feed Club mini-card reads Sport and category from the active primary registration', () => {
  const miniCard = readFileSync('components/profiles/ProfileMiniCard.tsx', 'utf8');
  assert.match(miniCard, /fetch\('\/api\/clubs\/registrations'/);
  assert.match(miniCard, /find\(\(registration\) => registration\.is_primary\)/);
  assert.match(miniCard, /primaryClubRegistration\?\.sports/);
  assert.match(miniCard, /primaryClubRegistration\?\.category\?\.canonical_name \?\? null/);
  assert.doesNotMatch(miniCard, /\{p\?\.club_league_category && \(/);
  assert.doesNotMatch(miniCard, /\{p\.club_league_category\}/);
});

test('public Club profile renders canonical headquarters and never revives a stale legacy category', () => {
  const publicProfile = readFileSync('app/(dashboard)/clubs/[id]/page.tsx', 'utf8');
  assert.match(publicProfile, /loadPublicClubResidence\(profile\.id\)/);
  assert.match(publicProfile, /canonicalLocationLabel\(canonicalResidence/);
  assert.match(publicProfile, /\[residence\.area, \.\.\.\[\.\.\.residence\.ancestors\]\.reverse\(\)\]/);
  assert.match(publicProfile, /profile\.club_stadium \|\| '—'/);
  assert.match(publicProfile, /profile\.club_stadium_address/);
  assert.match(publicProfile, /primaryRegistration\?\.category\?\.canonical_name \?\? null/);
  assert.doesNotMatch(publicProfile, /primaryRegistration\?\.category\?\.canonical_name \?\? categoryLabel/);
});

test('Player Club-of-belonging card consumes the same active canonical registration identity', () => {
  const playerProfile = readFileSync('app/(dashboard)/players/[id]/page.tsx', 'utf8');
  const publicRegistrations = readFileSync('app/api/clubs/[id]/registrations/route.ts', 'utf8');
  assert.match(playerProfile, /\/api\/clubs\/\$\{encodeURIComponent\(visibleClubProfile\.id\)\}\/registrations/);
  assert.match(playerProfile, /registration\.sports/);
  assert.match(playerProfile, /sportsOrganizationDisplayName/);
  assert.match(playerProfile, /registration\.category\?\.canonical_name/);
  assert.match(playerProfile, /primaryRegistration\?\.category\?\.country/);
  assert.doesNotMatch(playerProfile, /\[clubOfBelonging\.club_league_category, normalizedClubSport\]/);
  assert.match(publicRegistrations, /category:sports_organization_category_id\(canonical_name,country:countries\(iso2\)\)/);
});
