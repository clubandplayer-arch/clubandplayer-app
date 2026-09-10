import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CanonicalSportsCompatibilityError,
  parseCanonicalSportsWriteIntent,
  planCanonicalSportsWrite,
  resolveCanonicalSportsReference,
  type CanonicalCatalogReference,
} from '../../lib/taxonomy/canonicalSportsCompatibility';

type SportRecord = CanonicalCatalogReference & { code: string; coherent: boolean };

const football: SportRecord = { id: 'sport-football', code: 'football', isActive: true, coherent: true };
const inactive: SportRecord = { id: 'sport-old', code: 'old', isActive: false, coherent: true };
const broken: SportRecord = { id: 'sport-broken', code: 'broken', isActive: true, coherent: false };
const records = new Map([football, inactive, broken].map((record) => [record.id, record]));

const matches = (value: string) => {
  if (value.toLowerCase() === 'calcio') return [{ canonical: football, normalizedLegacyValue: 'Calcio' }];
  if (value === 'old') return [{ canonical: inactive, normalizedLegacyValue: 'Old sport' }];
  if (value === 'shared') return [
    { canonical: football, normalizedLegacyValue: 'Shared' },
    { canonical: inactive, normalizedLegacyValue: 'Shared' },
  ];
  return [];
};

const readAdapter = {
  findCanonicalById: (id: string) => records.get(id) ?? null,
  findLegacyMatches: matches,
  isCoherentHistoricalReference: (record: SportRecord) => record.coherent,
};

const writeAdapter = {
  findCanonicalById: readAdapter.findCanonicalById,
  findLegacyMatches: matches,
  isCoherentNewReference: (record: SportRecord) => record.coherent,
  projectStableLegacyValue: (record: SportRecord) => record.code === 'football' ? 'Calcio' : null,
};

test('canonical read has precedence and inactive historical references remain resolvable', () => {
  const active = resolveCanonicalSportsReference({ canonicalId: football.id, legacyValue: 'Legacy' }, readAdapter);
  assert.equal(active.status, 'canonical');
  assert.equal(active.canonical, football);

  const historical = resolveCanonicalSportsReference({ canonicalId: inactive.id }, readAdapter);
  assert.equal(historical.status, 'canonical');
  assert.equal(historical.canonical?.isActive, false);
});

test('invalid canonical references remain observable and never downgrade to legacy mapping', () => {
  for (const canonicalId of ['missing', broken.id]) {
    const result = resolveCanonicalSportsReference({ canonicalId, legacyValue: 'Calcio' }, readAdapter);
    assert.equal(result.status, 'invalid_reference');
    assert.equal(result.canonical, null);
    assert.equal(result.displayFallback, 'Calcio');
  }
});

test('legacy reads distinguish unique, raw, ambiguous and empty values', () => {
  assert.equal(resolveCanonicalSportsReference({ legacyValue: ' calcio ' }, readAdapter).status, 'legacy_mapped');
  assert.equal(resolveCanonicalSportsReference({ legacyValue: 'unknown' }, readAdapter).status, 'legacy_raw');
  assert.equal(resolveCanonicalSportsReference({ legacyValue: 'shared' }, readAdapter).status, 'ambiguous');
  assert.equal(resolveCanonicalSportsReference({}, readAdapter).status, 'empty');
  assert.equal(resolveCanonicalSportsReference({ legacyValue: '  ' }, readAdapter).status, 'empty');
});

test('write parser preserves absent and requires an explicit isolated reset', () => {
  assert.deepEqual(parseCanonicalSportsWriteIntent({}), { kind: 'absent' });
  assert.deepEqual(parseCanonicalSportsWriteIntent({ reset: true }), { kind: 'reset' });
  assert.throws(
    () => parseCanonicalSportsWriteIntent({ reset: true, legacyValue: 'Calcio' }),
    (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'conflicting_input',
  );
  assert.throws(() => parseCanonicalSportsWriteIntent({ reset: false }), CanonicalSportsCompatibilityError);
});

test('write parser rejects conflicting, blank and malformed values before planning', () => {
  assert.throws(
    () => parseCanonicalSportsWriteIntent({ canonicalId: football.id, legacyValue: 'Calcio' }),
    (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'conflicting_input',
  );
  for (const payload of [{ canonicalId: '' }, { legacyValue: '  ' }, { legacyValue: null }]) {
    assert.throws(() => parseCanonicalSportsWriteIntent(payload), CanonicalSportsCompatibilityError);
  }
});

test('absent makes no change and reset clears only the adapter group', () => {
  assert.deepEqual(planCanonicalSportsWrite({ kind: 'absent' }, writeAdapter), { action: 'no_change' });
  assert.deepEqual(planCanonicalSportsWrite({ kind: 'reset' }, writeAdapter), {
    action: 'write', source: 'reset', canonical: null, canonicalId: null, legacyValue: null,
  });
});

test('canonical writes require an active coherent reference and use a stable legacy projection', () => {
  assert.deepEqual(planCanonicalSportsWrite({ kind: 'canonical', canonicalId: football.id }, writeAdapter), {
    action: 'write', source: 'canonical', canonical: football, canonicalId: football.id, legacyValue: 'Calcio',
  });
  for (const canonicalId of ['missing', inactive.id, broken.id]) {
    assert.throws(
      () => planCanonicalSportsWrite({ kind: 'canonical', canonicalId }, writeAdapter),
      (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'invalid_reference',
    );
  }
});

test('legacy writes dual-write only one active coherent match', () => {
  const mapped = planCanonicalSportsWrite({ kind: 'legacy', legacyValue: 'calcio' }, writeAdapter);
  assert.equal(mapped.action, 'write');
  if (mapped.action === 'write') {
    assert.equal(mapped.source, 'legacy_mapped');
    assert.equal(mapped.canonicalId, football.id);
    assert.equal(mapped.legacyValue, 'Calcio');
  }
});

test('unknown, ambiguous and inactive legacy writes clear only the stale canonical reference', () => {
  const cases = [
    { value: 'unknown', source: 'legacy_raw' },
    { value: 'shared', source: 'ambiguous' },
    { value: 'old', source: 'legacy_raw' },
  ] as const;
  for (const item of cases) {
    const plan = planCanonicalSportsWrite({ kind: 'legacy', legacyValue: item.value }, writeAdapter);
    assert.equal(plan.action, 'write');
    if (plan.action === 'write') {
      assert.equal(plan.source, item.source);
      assert.equal(plan.canonicalId, null);
      assert.equal(plan.legacyValue, item.value);
    }
  }
});
