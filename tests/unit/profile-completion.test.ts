import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getMissingRequiredProfileFields, isProfileComplete } from '../../lib/profiles/completion';
import { getProfileClubNameValidationError, isValidProfileClubName } from '../../lib/profiles/nameValidation';
import { getProfileVisibilityStatusCopy, normalizeProfileVisibilityStatus } from '../../lib/profiles/publication';
import { getClubNameReviewReason, isMissingClubQualitySchemaError, normalizeClubNameForDuplicateCheck, shouldIncludeClubInQualityList } from '../../lib/profiles/clubNameReview';

const completeClub = {
  account_type: 'club',
  full_name: 'ASD Club Carlentini',
  display_name: 'ASD Club Carlentini',
  residence_country_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  residence_geo_area_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
} as const;

test('uses the same syntax-only club-name rule for saving and completion', () => {
  assert.equal(isValidProfileClubName('Osasuna'), true);
  assert.equal(getProfileClubNameValidationError('Osasuna'), null);
  assert.deepEqual(getMissingRequiredProfileFields({ ...completeClub, full_name: 'Osasuna', display_name: 'Osasuna' }), []);
  assert.equal(isValidProfileClubName('Club <script>'), false);
});

test('publishes only a club with a valid name and all mandatory fields', () => {
  assert.equal(isProfileComplete(completeClub), true);
  assert.equal(isProfileComplete({ ...completeClub, residence_geo_area_id: null }), false);
  assert.equal(isProfileComplete({ ...completeClub, full_name: 'Osasuna', display_name: 'Osasuna' }), true);
});

test('Club completion requires only a valid name and complete canonical residence', () => {
  const canonicalClub = {
    ...completeClub,
    sport: null,
    country: null,
    region: null,
    province: null,
    city: null,
    residence_country_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    residence_geo_area_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  };
  assert.deepEqual(getMissingRequiredProfileFields(canonicalClub), []);
  assert.equal(isProfileComplete(canonicalClub), true);

  assert.deepEqual(
    getMissingRequiredProfileFields({ ...canonicalClub, residence_country_id: null }),
    ['Paese di residenza'],
  );
  assert.deepEqual(getMissingRequiredProfileFields({ ...canonicalClub, residence_geo_area_id: null }), ['area di residenza']);
});

test('database publication uses the same minimal Club requirements', () => {
  const migration = readFileSync('supabase/migrations/20261222120000_club_minimum_completion_requirements.sql', 'utf8');
  const clubCompletion = migration.match(/when account_kind = 'club' then([\s\S]*?)when account_kind in \('athlete', 'staff'\)/)?.[1] ?? '';
  assert.match(clubCompletion, /profile_preferences/);
  assert.match(clubCompletion, /residence_country_id is not null/);
  assert.match(clubCompletion, /residence_geo_area_id is not null/);
  assert.doesNotMatch(clubCompletion, /new\.sport/);
  assert.doesNotMatch(clubCompletion, /new\.(?:country|region|province|city)/);
  assert.match(migration, /profile_preferences_refresh_club_visibility/);
  assert.match(migration, /\{3,\}/);
});

test('database migration preserves existing public Clubs until they adopt canonical residence', () => {
  const migration = readFileSync('supabase/migrations/20261222120000_club_minimum_completion_requirements.sql', 'utf8');
  assert.match(migration, /create table if not exists public\.club_completion_grandfathered_profiles/);
  assert.match(migration, /profile\.profile_visibility_status = 'published'/);
  assert.match(migration, /on conflict \(profile_id\) do nothing/);
  assert.match(migration, /or exists \([\s\S]*club_completion_grandfathered_profiles grandfathered/);
  assert.match(migration, /if new\.residence_country_id is not null and new\.residence_geo_area_id is not null then[\s\S]*delete from public\.club_completion_grandfathered_profiles/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.club_completion_grandfathered_profiles from public, anon, authenticated/);
  assert.doesNotMatch(migration, /update public\.profiles[\s\S]*profile_visibility_status\s*=/);
  assert.doesNotMatch(migration, /delete from public\.profiles/);
});

test('normalizes and explains every publication lifecycle state', () => {
  assert.equal(normalizeProfileVisibilityStatus('published'), 'published');
  assert.equal(normalizeProfileVisibilityStatus('suspended'), 'suspended');
  assert.equal(normalizeProfileVisibilityStatus('unexpected'), 'draft');
  assert.equal(getProfileVisibilityStatusCopy('draft').label, 'Profilo in bozza');
  assert.equal(getProfileVisibilityStatusCopy('published').label, 'Profilo pubblicato');
  assert.equal(getProfileVisibilityStatusCopy('suspended').label, 'Profilo sospeso');
});

test('flags weak club names and normalizes likely duplicates', () => {
  assert.match(getClubNameReviewReason('Giovani Talenti Carlentini Europa', 'IT') ?? '', /riferimento societario/);
  assert.equal(getClubNameReviewReason('ASD Carlentini', 'IT'), null);
  assert.equal(normalizeClubNameForDuplicateCheck('A.S.D. Carlentini'), normalizeClubNameForDuplicateCheck('ASD Carlentini'));
});

test('keeps approved and rejected club-name decisions in moderation history', () => {
  assert.equal(shouldIncludeClubInQualityList(0, 'approved'), true);
  assert.equal(shouldIncludeClubInQualityList(0, 'rejected'), true);
  assert.equal(shouldIncludeClubInQualityList(0, 'pending'), false);
  assert.equal(shouldIncludeClubInQualityList(1, 'pending'), true);
});

test('recognizes a database where the P2 profile-quality migration is missing', () => {
  assert.equal(isMissingClubQualitySchemaError({ code: '42703', message: 'column profiles.registry_master_id does not exist' }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: 'PGRST204', message: "Could not find club_name_review_status" }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: 'PGRST204', message: "Could not find club_name_reviewed_by" }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: '42703', message: 'column unrelated_field does not exist' }), false);
  assert.equal(isMissingClubQualitySchemaError({ code: '23505', message: 'duplicate key' }), false);
});
