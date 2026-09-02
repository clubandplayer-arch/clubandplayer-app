import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TaxonomyCompatibilityError,
  planTaxonomyWrite,
  readTaxonomyCompatibility,
  type CanonicalTaxonomyRecord,
  type CanonicalTaxonomySelection,
  type LegacyTaxonomyValue,
  type TaxonomyCatalog,
  type TaxonomyDatabaseRow,
  type TaxonomyRoleKind,
} from '../../lib/taxonomy/compatibilityAdapter';

const football: CanonicalTaxonomyRecord = {
  sportId: 'sport-football', disciplineId: 'discipline-football', variantId: 'variant-eleven',
  playerRoleId: 'role-goalkeeper', staffRoleId: null,
  sportCode: 'football', disciplineCode: 'association_football', variantCode: 'eleven_a_side',
  playerRoleCode: 'goalkeeper', staffRoleCode: null,
  legacyProjection: { sport: 'Calcio', role: 'Portiere' },
};

class FakeCatalog implements TaxonomyCatalog {
  async getCanonical(value: CanonicalTaxonomySelection) {
    return value.sportId === football.sportId
      && value.disciplineId === football.disciplineId
      && value.variantId === football.variantId
      && value.playerRoleId === football.playerRoleId
      && value.staffRoleId === null ? football : null;
  }
  async resolveLegacy(value: LegacyTaxonomyValue, kind: TaxonomyRoleKind) {
    return value.sport === 'Calcio' && value.role === 'Portiere' && kind === 'player' ? football : null;
  }
}

const catalog = new FakeCatalog();
const legacyRow = (overrides: Partial<TaxonomyDatabaseRow> = {}): TaxonomyDatabaseRow => ({
  sport: 'Calcio', role: 'Portiere', sport_id: null, discipline_id: null, variant_id: null,
  player_role_id: null, staff_role_id: null, ...overrides,
});

test('5E read is canonical-first and never falls back from an invalid canonical tuple', async () => {
  const canonical = await readTaxonomyCompatibility(legacyRow({
    sport_id: football.sportId, discipline_id: football.disciplineId, variant_id: football.variantId,
    player_role_id: football.playerRoleId,
  }), 'player', catalog);
  assert.equal(canonical.source, 'canonical');
  assert.equal(canonical.canonical?.playerRoleCode, 'goalkeeper');
  assert.deepEqual(canonical.legacy, { sport: 'Calcio', role: 'Portiere' });

  const invalid = await readTaxonomyCompatibility(legacyRow({ sport_id: 'unknown' }), 'player', catalog);
  assert.equal(invalid.source, 'invalid_canonical');
  assert.equal(invalid.canonical, null);
  assert.deepEqual(invalid.errors, ['canonical_tuple_invalid']);
});

test('5E read maps recognized legacy and preserves unknown raw legacy', async () => {
  assert.equal((await readTaxonomyCompatibility(legacyRow(), 'player', catalog)).source, 'mapped_legacy');
  const unknown = await readTaxonomyCompatibility(legacyRow({ sport: 'Sport storico', role: 'Ruolo storico' }), 'player', catalog);
  assert.equal(unknown.source, 'raw_legacy');
  assert.deepEqual(unknown.legacy, { sport: 'Sport storico', role: 'Ruolo storico' });
  assert.equal((await readTaxonomyCompatibility(legacyRow({ sport: null, role: null }), 'player', catalog)).source, 'empty');
});

test('5E absent write is a no-op and explicit null clears canonical fields only', async () => {
  assert.deepEqual(await planTaxonomyWrite({}, 'player', catalog), {
    canonicalPatch: {}, legacyPatch: {}, source: 'absent',
  });
  assert.deepEqual(await planTaxonomyWrite({ canonical: null }, 'player', catalog), {
    canonicalPatch: { sport_id: null, discipline_id: null, variant_id: null, player_role_id: null, staff_role_id: null },
    legacyPatch: {}, source: 'clear_canonical',
  });
});

test('5E canonical write validates the tuple and projects existing legacy values without translation', async () => {
  const plan = await planTaxonomyWrite({ canonical: football }, 'player', catalog);
  assert.equal(plan.source, 'canonical');
  assert.deepEqual(plan.canonicalPatch, {
    sport_id: football.sportId, discipline_id: football.disciplineId, variant_id: football.variantId,
    player_role_id: football.playerRoleId, staff_role_id: null,
  });
  assert.deepEqual(plan.legacyPatch, { sport: 'Calcio', role: 'Portiere' });

  await assert.rejects(
    planTaxonomyWrite({ canonical: { ...football, variantId: 'variant-without-parent', disciplineId: null } }, 'player', catalog),
    (error: unknown) => error instanceof TaxonomyCompatibilityError && error.code === 'variant_requires_discipline',
  );
});

test('5E legacy write dual-maps known values but retains unknown values legacy-only', async () => {
  const mapped = await planTaxonomyWrite({ legacy: { sport: ' Calcio ', role: ' Portiere ' } }, 'player', catalog);
  assert.equal(mapped.source, 'legacy_mapped');
  assert.equal(mapped.canonicalPatch.sport_id, football.sportId);
  assert.deepEqual(mapped.legacyPatch, { sport: 'Calcio', role: 'Portiere' });

  const raw = await planTaxonomyWrite({ legacy: { sport: 'Sport storico', role: 'Ruolo storico' } }, 'player', catalog);
  assert.equal(raw.source, 'legacy_raw');
  assert.deepEqual(raw.canonicalPatch, {});
  assert.deepEqual(raw.legacyPatch, { sport: 'Sport storico', role: 'Ruolo storico' });
});

test('5E enforces Player/Staff separation before catalog access', async () => {
  await assert.rejects(
    planTaxonomyWrite({ canonical: { ...football, playerRoleId: null, staffRoleId: 'staff-coach' } }, 'player', catalog),
    (error: unknown) => error instanceof TaxonomyCompatibilityError && error.code === 'staff_role_not_allowed',
  );
  await assert.rejects(
    planTaxonomyWrite({ canonical: football }, 'staff', catalog),
    (error: unknown) => error instanceof TaxonomyCompatibilityError && error.code === 'player_role_not_allowed',
  );
});
