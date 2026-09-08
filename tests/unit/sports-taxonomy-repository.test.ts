import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SportsTaxonomyRepository,
  type DisciplineCatalogRow,
  type LegacySportMappingRow,
  type SportCatalogRow,
  type SportsTaxonomyDataSource,
  type VariantCatalogRow,
} from '../../lib/taxonomy/sportsTaxonomyRepository.server';

const ids = {
  football: '11111111-1111-4111-8111-111111111111',
  basketball: '22222222-2222-4222-8222-222222222222',
  association: '33333333-3333-4333-8333-333333333333',
  futsal: '44444444-4444-4444-8444-444444444444',
  five: '55555555-5555-4555-8555-555555555555',
  wrongDiscipline: '66666666-6666-4666-8666-666666666666',
  wrongVariant: '77777777-7777-4777-8777-777777777777',
};

const sports: SportCatalogRow[] = [
  { id: ids.football, code: 'football', canonicalName: 'Football', isActive: true },
  { id: ids.basketball, code: 'basketball', canonicalName: 'Basketball', isActive: true },
];
const disciplines: DisciplineCatalogRow[] = [
  { id: ids.association, sportId: ids.football, code: 'association_football', canonicalName: 'Association football', isActive: true, isIndependentlySelectable: true },
  { id: ids.futsal, sportId: ids.football, code: 'futsal', canonicalName: 'Futsal', isActive: false, isIndependentlySelectable: true },
  { id: ids.wrongDiscipline, sportId: ids.basketball, code: 'wrong', canonicalName: 'Wrong', isActive: true, isIndependentlySelectable: true },
];
const variants: VariantCatalogRow[] = [
  { id: ids.five, disciplineId: ids.futsal, code: 'five_a_side', canonicalName: 'Five-a-side', isActive: true, teamSize: 5 },
  { id: ids.wrongVariant, disciplineId: ids.wrongDiscipline, code: 'wrong', canonicalName: 'Wrong', isActive: true, teamSize: null },
];

class FakeSource implements SportsTaxonomyDataSource {
  calls: string[] = [];
  mappings: LegacySportMappingRow[] = [];

  async getSport(id: string) {
    this.calls.push(`sport:${id}`);
    return sports.find((row) => row.id === id) ?? null;
  }
  async getDiscipline(id: string) {
    this.calls.push(`discipline:${id}`);
    return disciplines.find((row) => row.id === id) ?? null;
  }
  async getVariant(id: string) {
    this.calls.push(`variant:${id}`);
    return variants.find((row) => row.id === id) ?? null;
  }
  async findActiveLegacyMappings(value: string, limit: number) {
    this.calls.push(`legacy:${value}:${limit}`);
    return this.mappings.filter((row) => row.normalizedSourceValue === value).slice(0, limit);
  }
}

test('loads and validates a bounded Sport → Discipline → Variant chain', async () => {
  const source = new FakeSource();
  const repository = new SportsTaxonomyRepository(source);
  const context = await repository.getContext({
    sportId: ids.football,
    disciplineId: ids.futsal,
    variantId: ids.five,
  });
  assert.equal(context?.sport.code, 'football');
  assert.equal(context?.discipline?.code, 'futsal');
  assert.equal(context?.variant?.code, 'five_a_side');
  assert.equal(context?.isActive, false);
  assert.equal(source.calls.length, 3);
});

test('rejects malformed, partial and cross-sport chains without accepting incoherent data', async () => {
  const source = new FakeSource();
  const repository = new SportsTaxonomyRepository(source);
  assert.equal(await repository.getContext({ sportId: 'not-a-uuid' }), null);
  assert.equal(source.calls.length, 0);

  assert.equal(await repository.getContext({ sportId: ids.football, variantId: ids.five }), null);
  assert.equal(source.calls.length, 0);

  assert.equal(await repository.getContext({ sportId: ids.football, disciplineId: ids.wrongDiscipline }), null);
  assert.deepEqual(source.calls, [`sport:${ids.football}`, `discipline:${ids.wrongDiscipline}`]);
});

test('canonical resolution validates the full chain and does not query legacy mappings', async () => {
  const source = new FakeSource();
  source.mappings = [{
    normalizedSourceValue: 'calcio', legacyDisplayLabel: 'Calcio', sportId: ids.football,
  }];
  const repository = new SportsTaxonomyRepository(source);
  const resolved = await repository.resolve({
    canonical: { sportId: ids.football, disciplineId: ids.association },
    legacyValue: 'Calcio',
  });
  assert.equal(resolved.status, 'canonical');
  assert.equal(resolved.canonical?.discipline?.code, 'association_football');
  assert.equal(source.calls.some((call) => call.startsWith('legacy:')), false);
});

test('invalid canonical shapes remain invalid_reference and never downgrade to legacy', async () => {
  const source = new FakeSource();
  source.mappings = [{
    normalizedSourceValue: 'calcio', legacyDisplayLabel: 'Calcio', sportId: ids.football,
  }];
  const repository = new SportsTaxonomyRepository(source);
  const resolved = await repository.resolve({
    canonical: { disciplineId: ids.association },
    legacyValue: 'Calcio',
  });
  assert.equal(resolved.status, 'invalid_reference');
  assert.equal(resolved.displayFallback, 'Calcio');
  assert.equal(source.calls.length, 0);
});

test('legacy resolution normalizes input, limits mapping lookup to two and validates mapped chains', async () => {
  const source = new FakeSource();
  source.mappings = [{
    normalizedSourceValue: 'calcio_a_5',
    legacyDisplayLabel: 'Calcio a 5',
    sportId: ids.football,
    disciplineId: ids.futsal,
    variantId: ids.five,
  }];
  const repository = new SportsTaxonomyRepository(source);
  const resolved = await repository.resolve({ legacyValue: '  CALCIO A 5  ' });
  assert.equal(resolved.status, 'legacy_mapped');
  assert.equal(resolved.legacyValue, 'Calcio a 5');
  assert.equal(resolved.canonical?.variant?.teamSize, 5);
  assert.equal(source.calls[0], 'legacy:calcio_a_5:2');
  assert.equal(source.calls.length, 4);
});

test('unknown and ambiguous legacy values stay explicit', async () => {
  const source = new FakeSource();
  source.mappings = [
    { normalizedSourceValue: 'shared', legacyDisplayLabel: 'Shared', sportId: ids.football },
    { normalizedSourceValue: 'shared', legacyDisplayLabel: 'Shared', sportId: ids.basketball },
    { normalizedSourceValue: 'shared', legacyDisplayLabel: 'Ignored third', sportId: ids.football },
  ];
  const repository = new SportsTaxonomyRepository(source);
  assert.equal((await repository.resolve({ legacyValue: 'Unknown' })).status, 'legacy_raw');
  assert.equal((await repository.resolve({ legacyValue: 'shared' })).status, 'ambiguous');
  assert.equal((await repository.resolve({})).status, 'empty');
  assert.equal(source.calls.filter((call) => call === 'legacy:shared:2').length, 1);
  assert.equal(source.calls.some((call) => call === `sport:${ids.football}`), false);
});
