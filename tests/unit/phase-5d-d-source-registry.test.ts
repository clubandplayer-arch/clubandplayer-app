import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Source = {
  key: string;
  country: string | null;
  officialUrl: string;
  status: string;
  reuseStatus: string;
  stableRecordIdentifiers: string;
};

const registry = JSON.parse(
  readFileSync(resolve('data/sports/phase-5d-d-source-registry.json'), 'utf8'),
) as {
  schemaVersion: number;
  scope: { countries: string[]; disclaimer: string };
  policy: { requiredApprovalEvidence: string[]; nationalProperNames: string; translatedIdentityPersistence: boolean; fuzzyIdentityMatching: boolean };
  sources: Source[];
  coverageGaps: string[];
};

test('5D-D registry covers every launch country and does not approve discovery URLs for ingestion', () => {
  assert.equal(registry.schemaVersion, 1);
  assert.deepEqual([...registry.scope.countries].sort(), ['CH', 'ES', 'FR', 'IT', 'PL', 'SI']);
  const covered = new Set(registry.sources.map((source) => source.country).filter(Boolean));
  assert.deepEqual([...covered].sort(), ['CH', 'ES', 'FR', 'IT', 'PL', 'SI']);
  assert.ok(registry.sources.every((source) => source.status !== 'approved_for_manifest'));
  assert.ok(registry.sources.every((source) => source.reuseStatus.startsWith('blocked_')));
  assert.ok(registry.sources.every((source) => source.stableRecordIdentifiers === 'not_evidenced'));
});

test('5D-D registry is fail-closed on identity, licensing and national proper names', () => {
  assert.match(registry.scope.disclaimer, /No source is approved/);
  assert.ok(registry.policy.requiredApprovalEvidence.includes('explicit_reuse_terms'));
  assert.ok(registry.policy.requiredApprovalEvidence.includes('stable_record_identifier'));
  assert.equal(registry.policy.nationalProperNames, 'preserve_source_language');
  assert.equal(registry.policy.translatedIdentityPersistence, false);
  assert.equal(registry.policy.fuzzyIdentityMatching, false);
  assert.ok(registry.sources.every((source) => source.officialUrl.startsWith('https://')));
  assert.ok(registry.coverageGaps.length >= 6);
});
