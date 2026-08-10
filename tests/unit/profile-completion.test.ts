import assert from 'node:assert/strict';
import test from 'node:test';

import { getMissingRequiredProfileFields, isProfileComplete } from '../../lib/profiles/completion';
import { getProfileClubNameValidationError, isValidProfileClubName } from '../../lib/profiles/nameValidation';
import { getProfileVisibilityStatusCopy, normalizeProfileVisibilityStatus } from '../../lib/profiles/publication';
import { getClubNameReviewReason, isMissingClubQualitySchemaError, normalizeClubNameForDuplicateCheck } from '../../lib/profiles/clubNameReview';

const completeClub = {
  account_type: 'club',
  full_name: 'ASD Club Carlentini',
  display_name: 'ASD Club Carlentini',
  sport: 'Calcio',
  country: 'IT',
  region: 'Sicilia',
  province: 'Siracusa',
  city: 'Carlentini',
} as const;

test('uses the same club-name rule for saving and completion', () => {
  for (const name of ['Giacomo', 'giacomo', 'GIACOMO', 'Mario Rossi']) {
    assert.equal(isValidProfileClubName(name), false);
    assert.match(getProfileClubNameValidationError(name) ?? '', /denominazione della società/);
    assert.deepEqual(
      getMissingRequiredProfileFields({ ...completeClub, full_name: name, display_name: name }),
      ['nome società'],
    );
  }
});

test('publishes only a club with a valid name and all mandatory fields', () => {
  assert.equal(isProfileComplete(completeClub), true);
  assert.equal(isProfileComplete({ ...completeClub, city: null }), false);
  assert.equal(isProfileComplete({ ...completeClub, full_name: 'Giacomo', display_name: 'Giacomo' }), false);
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
  assert.match(getClubNameReviewReason('Giovani Talenti Carlentini Europa') ?? '', /riferimento societario/);
  assert.equal(getClubNameReviewReason('ASD Carlentini'), null);
  assert.equal(normalizeClubNameForDuplicateCheck('A.S.D. Carlentini'), normalizeClubNameForDuplicateCheck('ASD Carlentini'));
});

test('recognizes a database where the P2 profile-quality migration is missing', () => {
  assert.equal(isMissingClubQualitySchemaError({ code: '42703', message: 'column profiles.registry_master_id does not exist' }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: 'PGRST204', message: "Could not find club_name_review_status" }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: 'PGRST204', message: "Could not find club_name_reviewed_by" }), true);
  assert.equal(isMissingClubQualitySchemaError({ code: '23505', message: 'duplicate key' }), false);
});
