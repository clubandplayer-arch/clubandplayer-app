import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assessSportsSourceReadiness,
  assessSportsSourceRegistry,
  SOURCE_APPROVAL_EVIDENCE_FIELDS,
  type SportsSourceReadinessInput,
} from '../../lib/taxonomy/sportsSourceReadiness';

const registry = JSON.parse(
  readFileSync(resolve('data/sports/phase-5d-d-source-registry.json'), 'utf8'),
) as { sources: SportsSourceReadinessInput[] };

test('5D-E pre-import gate blocks every discovery-only source', () => {
  const results = assessSportsSourceRegistry(registry.sources);
  assert.equal(results.length, 7);
  assert.ok(results.every((result) => !result.readyForLocalManifest));
  assert.ok(results.every((result) => result.blockers.some((value) => value.startsWith('status:'))));
  assert.ok(results.every((result) => result.blockers.includes('evidence:explicitReuseTermsUrl:missing')));
  assert.ok(results.every((result) => result.blockers.includes('evidence:retrievalChecksum:missing')));
});

test('5D-E readiness requires the complete evidence pack and a valid checksum', () => {
  const evidence = Object.fromEntries(
    SOURCE_APPROVAL_EVIDENCE_FIELDS.map((field) => [field, `verified-${field}`]),
  );
  evidence.datasetUrl = 'https://authority.example/dataset.json';
  evidence.explicitReuseTermsUrl = 'https://authority.example/reuse';
  evidence.retrievalChecksum = `sha256:${'a'.repeat(64)}`;

  const ready = assessSportsSourceReadiness({
    key: 'TEST:football:AUTHORITY',
    status: 'approved_for_manifest',
    reuseStatus: 'approved_explicit_reuse_terms',
    stableRecordIdentifiers: 'evidenced',
    approvalEvidence: evidence,
  });
  assert.deepEqual(ready, { key: 'TEST:football:AUTHORITY', readyForLocalManifest: true, blockers: [] });

  const invalid = assessSportsSourceReadiness({
    key: 'TEST:football:INVALID',
    status: 'approved_for_manifest',
    reuseStatus: 'approved_explicit_reuse_terms',
    stableRecordIdentifiers: 'evidenced',
    approvalEvidence: { ...evidence, retrievalChecksum: 'sha256:not-a-checksum' },
  });
  assert.equal(invalid.readyForLocalManifest, false);
  assert.ok(invalid.blockers.includes('evidence:retrievalChecksum:invalid'));
});
