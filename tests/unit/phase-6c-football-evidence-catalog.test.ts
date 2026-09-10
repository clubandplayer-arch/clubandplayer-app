import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type EvidenceCountry = {
  country: string;
  sourceUrl: string;
  httpStatus: number;
  retrievalSha256: string | null;
  researchDocument: string;
};

type CatalogEntry = {
  country: string;
  code: string;
  officialName: string;
  scope: string;
  levelRank: number | null;
  status: string;
  selectorEligibleAfterReview: boolean;
};

const evidence = JSON.parse(readFileSync(resolve(
  'data/sports/evidence/phase-6c-football-six-country-evidence-pack.json',
), 'utf8')) as {
  countries: EvidenceCountry[];
  reuseAssessment: { automaticImportAllowed: boolean; factualReviewCatalogAllowed: boolean };
  decision: { status: string; mayCreateSeedOrMigration: boolean; mayConnectRuntimeSelector: boolean };
};

const catalog = JSON.parse(readFileSync(resolve(
  'data/sports/phase-6c-football-level-review-catalog.json',
), 'utf8')) as {
  sportCode: string;
  displayPolicy: string;
  importAuthorized: boolean;
  runtimeAuthorized: boolean;
  entries: CatalogEntry[];
};

const launchCountries = ['CH', 'ES', 'FR', 'IT', 'PL', 'SI'];

test('evidence pack covers each launch country exactly once with official HTTPS sources', () => {
  assert.deepEqual(evidence.countries.map((item) => item.country).sort(), launchCountries);
  assert.equal(new Set(evidence.countries.map((item) => item.country)).size, launchCountries.length);
  for (const item of evidence.countries) {
    assert.match(item.sourceUrl, /^https:\/\//);
    assert.ok([200, 403].includes(item.httpStatus));
    if (item.httpStatus === 200) assert.match(item.retrievalSha256 ?? '', /^sha256:[a-f0-9]{64}$/);
    if (item.httpStatus === 403) assert.equal(item.retrievalSha256, null);
    assert.ok(readFileSync(resolve(item.researchDocument), 'utf8').length > 0);
  }
});

test('review catalogue contains native official names keyed by country without locale variants', () => {
  assert.equal(catalog.sportCode, 'football');
  assert.equal(catalog.displayPolicy, 'official_name_is_not_translated_by_ui_locale');
  assert.deepEqual([...new Set(catalog.entries.map((entry) => entry.country))].sort(), launchCountries);
  const keys = catalog.entries.map((entry) => `${entry.country}:${entry.code}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const entry of catalog.entries) {
    assert.match(entry.code, /^[a-z][a-z0-9_]*$/);
    assert.ok(entry.officialName.trim());
    assert.ok(entry.scope.trim());
    assert.equal('localizedNames' in entry, false);
  }
  assert.ok(catalog.entries.some((entry) => entry.officialName === 'Promozione'));
  assert.ok(catalog.entries.some((entry) => entry.officialName === 'Régional 1'));
  assert.ok(catalog.entries.some((entry) => entry.officialName === 'Medobčinska liga'));
  assert.ok(catalog.entries.some((entry) => entry.officialName === 'Klasa Okręgowa'));
});

test('territorial candidates cannot become selector values before organizer-specific review', () => {
  for (const entry of catalog.entries) {
    if (entry.status === 'territorial_candidate' || entry.status === 'needs_current_source_review') {
      assert.equal(entry.selectorEligibleAfterReview, false);
    }
  }
});

test('6C artifacts stay review-only and cannot authorize seed, migration or runtime', () => {
  assert.equal(evidence.reuseAssessment.automaticImportAllowed, false);
  assert.equal(evidence.reuseAssessment.factualReviewCatalogAllowed, true);
  assert.equal(evidence.decision.status, 'READY_FOR_HUMAN_FACTUAL_REVIEW_NOT_FOR_IMPORT');
  assert.equal(evidence.decision.mayCreateSeedOrMigration, false);
  assert.equal(evidence.decision.mayConnectRuntimeSelector, false);
  assert.equal(catalog.importAuthorized, false);
  assert.equal(catalog.runtimeAuthorized, false);
});
