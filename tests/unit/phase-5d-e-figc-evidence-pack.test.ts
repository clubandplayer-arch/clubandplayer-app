import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { assessSportsSourceReadiness, type SportsSourceReadinessInput } from '../../lib/taxonomy/sportsSourceReadiness';

const evidence = JSON.parse(
  readFileSync(resolve('data/sports/evidence/phase-5d-e-b-figc-it-evidence-pack.json'), 'utf8'),
) as {
  sourceKey: string;
  country: string;
  competitionScopePage: { classification: string; retrievalSha256: string };
  discoveryIndex: { classification: string };
  reuseTerms: { explicitOpenDataLicense: null; databaseReuseGrant: null; assessment: string };
  dataset: { url: null; stableRecordIdentifier: null };
  readinessInput: SportsSourceReadinessInput;
  decision: { status: string; mayCreateOrganizationCompetitionManifest: boolean; mayCreateSeedOrMigration: boolean };
};

test('FIGC evidence pack distinguishes official pages from an ingestible dataset', () => {
  assert.equal(evidence.sourceKey, 'IT:football:FIGC');
  assert.equal(evidence.country, 'IT');
  assert.equal(evidence.competitionScopePage.classification, 'human_readable_scope_page_not_dataset');
  assert.equal(evidence.discoveryIndex.classification, 'website_sitemap_not_catalog_dataset');
  assert.equal(evidence.dataset.url, null);
  assert.equal(evidence.dataset.stableRecordIdentifier, null);
  assert.match(evidence.competitionScopePage.retrievalSha256, /^sha256:[a-f0-9]{64}$/);
});

test('FIGC evidence pack remains blocked by reuse and source identity gates', () => {
  assert.equal(evidence.reuseTerms.explicitOpenDataLicense, null);
  assert.equal(evidence.reuseTerms.databaseReuseGrant, null);
  assert.equal(evidence.reuseTerms.assessment, 'site_terms_reserve_rights_and_do_not_grant_catalog_reuse');
  const readiness = assessSportsSourceReadiness(evidence.readinessInput);
  assert.equal(readiness.readyForLocalManifest, false);
  assert.ok(readiness.blockers.includes('reuse:blocked_reuse_not_granted'));
  assert.ok(readiness.blockers.includes('stable_record_identifiers:not_evidenced'));
  assert.ok(readiness.blockers.includes('evidence:datasetUrl:missing'));
  assert.ok(readiness.blockers.includes('evidence:datasetVersionOrEffectiveDate:missing'));
  assert.ok(readiness.blockers.includes('evidence:coverageAndExclusions:missing'));
  assert.equal(evidence.decision.status, 'BLOCKED_NOT_READY_FOR_LOCAL_MANIFEST');
  assert.equal(evidence.decision.mayCreateOrganizationCompetitionManifest, false);
  assert.equal(evidence.decision.mayCreateSeedOrMigration, false);
});
