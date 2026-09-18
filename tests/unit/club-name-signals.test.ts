import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLUB_NAME_ACRONYMS_BY_COUNTRY,
  hasRecognizedClubNameAcronym,
  normalizeClubNameAcronym,
} from '../../lib/clubs/clubNameSignals';
import { isProfileComplete } from '../../lib/profiles/completion';
import { getClubNameReviewReason } from '../../lib/profiles/clubNameReview';

const namesByCountry = {
  IT: ['ASD Carlentini', 'Carlentini U.S.D.'],
  FR: ['AS Monaco', 'U.S. Orléans'],
  ES: ['U.D. Almería', 'Getafe C.F.', 'RCD Espanyol'],
  CH: ['SC Kriens', 'FC Lugano', 'CB Lumnezia'],
  SI: ['NK Maribor', 'N.Š. Mura', 'ŽNK Ljubljana'],
  PL: ['ŁKS Łódź', 'MKS Kluczbork'],
} as const;

test('recognizes beginning, middle and ending acronyms for every supported country', () => {
  for (const [country, names] of Object.entries(namesByCountry)) {
    for (const name of names) assert.equal(hasRecognizedClubNameAcronym(name, country), true, `${country}: ${name}`);
  }
  assert.equal(hasRecognizedClubNameAcronym('Almería UD Juvenil', 'ES'), true);
});

test('recognition is case-insensitive and accepts optional dots', () => {
  assert.equal(hasRecognizedClubNameAcronym('a.s. monaco', 'FR'), true);
  assert.equal(hasRecognizedClubNameAcronym('Getafe C.F.', 'ES'), true);
  assert.equal(hasRecognizedClubNameAcronym('Carlentini f.c', 'IT'), true);
});

test('normalizes the documented Unicode and ASCII variants', () => {
  for (const [accented, ascii] of [['NŠ', 'NS'], ['ŠD', 'SD'], ['ŽNK', 'ZNK'], ['ŁKS', 'LKS']]) {
    assert.equal(normalizeClubNameAcronym(accented), normalizeClubNameAcronym(ascii));
  }
  for (const name of ['NŠ Mura', 'NS Mura', 'ŠD Ptuj', 'SD Ptuj', 'ŽNK Ljubljana', 'ZNK Ljubljana']) {
    assert.equal(hasRecognizedClubNameAcronym(name, 'SI'), true, name);
  }
  assert.equal(hasRecognizedClubNameAcronym('ŁKS Łódź', 'PL'), true);
  assert.equal(hasRecognizedClubNameAcronym('LKS Lodz', 'PL'), true);
});

test('isolates acronym catalogs by canonical ISO alpha-2 country', () => {
  assert.equal(hasRecognizedClubNameAcronym('NK Maribor', 'SI'), true);
  assert.equal(hasRecognizedClubNameAcronym('NK Maribor', 'FR'), false);
  assert.equal(hasRecognizedClubNameAcronym('UD Almería', 'ES'), true);
  assert.equal(hasRecognizedClubNameAcronym('UD Almería', 'PL'), false);
  assert.equal(hasRecognizedClubNameAcronym('NK Maribor', null), false);
  assert.equal(hasRecognizedClubNameAcronym('NK Maribor', 'DE'), false);
});

test('uses safe Unicode token boundaries and rejects substrings', () => {
  for (const name of ['Casa Blanca', 'Musica Sportiva', 'Academy']) {
    assert.equal(hasRecognizedClubNameAcronym(name, 'IT'), false, name);
  }
  assert.equal(hasRecognizedClubNameAcronym('RCD Espanyol', 'ES'), true);
  assert.equal(hasRecognizedClubNameAcronym('SUPERCD Espanyol', 'ES'), false);
});

test('retains every previously recognized Italian acronym and the expanded catalog', () => {
  for (const acronym of ['FC', 'ASD', 'SSD', 'US', 'SS', 'AS', 'GS', 'AC', 'SC', 'CS', 'POL', 'USD', 'UC']) {
    assert.ok((CLUB_NAME_ACRONYMS_BY_COUNTRY.IT as readonly string[]).includes(acronym), acronym);
    assert.equal(hasRecognizedClubNameAcronym(`${acronym} Carlentini`, 'IT'), true, acronym);
  }
});

test('an acronym is a moderation signal, not a publication requirement', () => {
  const canonicalResidence = {
    account_type: 'club',
    residence_country_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    residence_geo_area_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  } as const;
  for (const name of ['Olympique Marseille', 'Stade Rennais', 'Osasuna', 'Young Boys', 'Grasshopper', 'Korona Kielce', 'Polonia Warszawa', 'Domžale']) {
    assert.equal(isProfileComplete({ ...canonicalResidence, full_name: name, display_name: name }), true, name);
  }
  assert.equal(getClubNameReviewReason('AS Monaco', 'FR'), null);
  assert.match(getClubNameReviewReason('Giovani Talenti', 'IT') ?? '', /riferimento societario/);
});
