import assert from 'node:assert/strict';
import test from 'node:test';

import type { CanonicalSportsReadResolution } from '../../lib/taxonomy/canonicalSportsCompatibility';
import {
  CanonicalSportContextService,
  type CanonicalSportContext,
} from '../../lib/taxonomy/canonicalSportContextService.server';
import type { SportDisciplineVariantContext } from '../../lib/taxonomy/sportsTaxonomyRepository.server';

const context: SportDisciplineVariantContext = {
  id: 'context-key',
  isActive: true,
  sport: {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'football',
    canonicalName: 'Football',
    isActive: true,
  },
  discipline: {
    id: '22222222-2222-4222-8222-222222222222',
    sportId: '11111111-1111-4111-8111-111111111111',
    code: 'association_football',
    canonicalName: 'Association football',
    isActive: true,
    isIndependentlySelectable: true,
  },
  variant: {
    id: '33333333-3333-4333-8333-333333333333',
    disciplineId: '22222222-2222-4222-8222-222222222222',
    code: 'eleven_a_side',
    canonicalName: 'Eleven-a-side',
    isActive: true,
    teamSize: 11,
  },
};

const resolution = (
  status: CanonicalSportContext['resolution'],
  canonical: SportDisciplineVariantContext | null,
): CanonicalSportsReadResolution<SportDisciplineVariantContext> => ({
  status,
  canonical,
  legacyValue: status === 'empty' ? null : 'Calcio',
  displayFallback: status === 'empty' ? null : 'Calcio',
});

test('canonical and legacy_mapped states expose the same canonical Sport context IDs', async () => {
  for (const status of ['canonical', 'legacy_mapped'] as const) {
    const service = new CanonicalSportContextService({ resolve: async () => resolution(status, context) });
    assert.deepEqual(await service.resolve({ legacyValue: 'Calcio' }), {
      resolution: status,
      sportId: context.sport.id,
      disciplineId: context.discipline?.id,
      variantId: context.variant?.id,
      playerPositionId: null,
      staffRoleId: null,
    });
  }
});

test('legacy_raw, ambiguous, empty and invalid_reference never fabricate canonical IDs', async () => {
  for (const status of ['legacy_raw', 'ambiguous', 'empty', 'invalid_reference'] as const) {
    const service = new CanonicalSportContextService({ resolve: async () => resolution(status, null) });
    assert.deepEqual(await service.resolve({ legacyValue: 'Calcio' }), {
      resolution: status,
      sportId: null,
      disciplineId: null,
      variantId: null,
      playerPositionId: null,
      staffRoleId: null,
    });
  }
});

test('service delegates the unmodified read input exactly once to the repository boundary', async () => {
  const calls: unknown[] = [];
  const service = new CanonicalSportContextService({
    resolve: async (input) => {
      calls.push(input);
      return resolution('empty', null);
    },
  });
  const input = { canonical: { sportId: context.sport.id }, legacyValue: 'Calcio' };
  await service.resolve(input);
  assert.deepEqual(calls, [input]);
});

test('wire object contains only the additive 5B CanonicalSportContext fields', async () => {
  const service = new CanonicalSportContextService({ resolve: async () => resolution('canonical', context) });
  const result = await service.resolve({});
  assert.deepEqual(Object.keys(result).sort(), [
    'disciplineId',
    'playerPositionId',
    'resolution',
    'sportId',
    'staffRoleId',
    'variantId',
  ]);
  assert.equal('canonicalName' in result, false);
  assert.equal('isActive' in result, false);
});
