import assert from 'node:assert/strict';
import test from 'node:test';

import { CanonicalSportsCompatibilityError } from '../../lib/taxonomy/canonicalSportsCompatibility';
import { CanonicalSportWritePlanService } from '../../lib/taxonomy/canonicalSportWritePlanService.server';
import type { SportDisciplineVariantContext } from '../../lib/taxonomy/sportsTaxonomyRepository.server';

const context: SportDisciplineVariantContext = {
  id: 'context',
  isActive: true,
  sport: { id: '11111111-1111-4111-8111-111111111111', code: 'football', canonicalName: 'Football', isActive: true },
  discipline: { id: '22222222-2222-4222-8222-222222222222', sportId: '11111111-1111-4111-8111-111111111111', code: 'association_football', canonicalName: 'Association football', isActive: true, isIndependentlySelectable: true },
  variant: { id: '33333333-3333-4333-8333-333333333333', disciplineId: '22222222-2222-4222-8222-222222222222', code: 'eleven_a_side', canonicalName: 'Eleven-a-side', isActive: true, teamSize: 11 },
};

const repository = (options: {
  canonical?: SportDisciplineVariantContext | null;
  projection?: { status: 'unique' | 'none' | 'ambiguous' | 'overflow'; value: string | null };
  legacyStatus?: 'legacy_mapped' | 'legacy_raw' | 'ambiguous';
} = {}) => ({
  getContext: async () => options.canonical === undefined ? context : options.canonical,
  getStableLegacyProjection: async () => options.projection ?? { status: 'unique' as const, value: 'Calcio' },
  resolve: async ({ legacyValue }: { legacyValue?: string | null }) => ({
    status: options.legacyStatus ?? 'legacy_mapped',
    canonical: (options.legacyStatus ?? 'legacy_mapped') === 'legacy_mapped'
      ? options.canonical === undefined ? context : options.canonical
      : null,
    legacyValue: options.legacyStatus === 'legacy_raw' || options.legacyStatus === 'ambiguous'
      ? legacyValue ?? null
      : 'Calcio',
    displayFallback: legacyValue ?? null,
  }),
});

test('absent is no_change and explicit reset clears only the complete Sport context group', async () => {
  const service = new CanonicalSportWritePlanService(repository());
  assert.deepEqual(await service.plan({}), { action: 'no_change' });
  assert.deepEqual(await service.plan({ reset: true }), {
    action: 'write', source: 'reset', sportId: null, disciplineId: null, variantId: null, legacyValue: null,
  });
});

test('canonical input produces IDs plus one exact stable compatibility projection', async () => {
  const service = new CanonicalSportWritePlanService(repository());
  assert.deepEqual(await service.plan({ canonical: {
    sportId: context.sport.id,
    disciplineId: context.discipline?.id,
    variantId: context.variant?.id,
  } }), {
    action: 'write', source: 'canonical', sportId: context.sport.id,
    disciplineId: context.discipline?.id, variantId: context.variant?.id, legacyValue: 'Calcio',
  });
});

test('canonical input permits null projection but rejects missing, inactive, ambiguous and overflow targets', async () => {
  const noProjection = new CanonicalSportWritePlanService(repository({ projection: { status: 'none', value: null } }));
  const noProjectionPlan = await noProjection.plan({ canonical: { sportId: context.sport.id } });
  assert.equal(noProjectionPlan.action, 'write');
  if (noProjectionPlan.action === 'write') assert.equal(noProjectionPlan.legacyValue, null);

  const inactive = { ...context, isActive: false };
  for (const service of [
    new CanonicalSportWritePlanService(repository({ canonical: null })),
    new CanonicalSportWritePlanService(repository({ canonical: inactive })),
    new CanonicalSportWritePlanService(repository({ projection: { status: 'ambiguous', value: null } })),
    new CanonicalSportWritePlanService(repository({ projection: { status: 'overflow', value: null } })),
  ]) {
    await assert.rejects(
      () => service.plan({ canonical: { sportId: context.sport.id } }),
      (error) => error instanceof CanonicalSportsCompatibilityError && error.code === 'invalid_reference',
    );
  }
});

test('unique active legacy mapping dual-writes normalized legacy and canonical IDs', async () => {
  const service = new CanonicalSportWritePlanService(repository());
  assert.deepEqual(await service.plan({ legacyValue: ' calcio ' }), {
    action: 'write', source: 'legacy_mapped', sportId: context.sport.id,
    disciplineId: context.discipline?.id, variantId: context.variant?.id, legacyValue: 'Calcio',
  });
});

test('raw, ambiguous and inactive legacy preserve raw and clear all stale canonical IDs', async () => {
  const cases = [
    { repo: repository({ legacyStatus: 'legacy_raw' }), source: 'legacy_raw' },
    { repo: repository({ legacyStatus: 'ambiguous' }), source: 'ambiguous' },
    { repo: repository({ canonical: { ...context, isActive: false } }), source: 'legacy_raw' },
  ] as const;
  for (const item of cases) {
    const service = new CanonicalSportWritePlanService(item.repo);
    assert.deepEqual(await service.plan({ legacyValue: 'Storico' }), {
      action: 'write', source: item.source, sportId: null, disciplineId: null, variantId: null,
      legacyValue: 'Storico',
    });
  }
});

test('conflicting, partial and malformed payloads fail before producing a plan', async () => {
  const service = new CanonicalSportWritePlanService(repository());
  const payloads = [
    { reset: true, legacyValue: 'Calcio' },
    { canonical: { sportId: context.sport.id }, legacyValue: 'Calcio' },
    { canonical: { disciplineId: context.discipline?.id } },
    { legacyValue: '  ' },
  ];
  for (const payload of payloads) {
    await assert.rejects(() => service.plan(payload), CanonicalSportsCompatibilityError);
  }
});
