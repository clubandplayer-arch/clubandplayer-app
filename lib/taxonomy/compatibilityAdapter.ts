export type TaxonomyRoleKind = 'player' | 'staff';

export type CanonicalTaxonomySelection = {
  sportId: string;
  disciplineId: string | null;
  variantId: string | null;
  playerRoleId: string | null;
  staffRoleId: string | null;
};

export type LegacyTaxonomyValue = {
  sport: string | null;
  role: string | null;
};

export type TaxonomyDatabaseRow = LegacyTaxonomyValue & {
  sport_id: string | null;
  discipline_id: string | null;
  variant_id: string | null;
  player_role_id: string | null;
  staff_role_id: string | null;
};

export type CanonicalTaxonomyRecord = CanonicalTaxonomySelection & {
  sportCode: string;
  disciplineCode: string | null;
  variantCode: string | null;
  playerRoleCode: string | null;
  staffRoleCode: string | null;
  legacyProjection: LegacyTaxonomyValue;
};

export interface TaxonomyCatalog {
  getCanonical(selection: CanonicalTaxonomySelection): Promise<CanonicalTaxonomyRecord | null>;
  resolveLegacy(value: LegacyTaxonomyValue, roleKind: TaxonomyRoleKind): Promise<CanonicalTaxonomyRecord | null>;
}

export type TaxonomyReadResult = {
  source: 'canonical' | 'mapped_legacy' | 'raw_legacy' | 'empty' | 'invalid_canonical';
  canonical: CanonicalTaxonomyRecord | null;
  legacy: LegacyTaxonomyValue;
  errors: string[];
};

export async function readTaxonomyCompatibility(
  row: TaxonomyDatabaseRow,
  roleKind: TaxonomyRoleKind,
  catalog: TaxonomyCatalog,
): Promise<TaxonomyReadResult> {
  const legacy = { sport: cleanLegacy(row.sport), role: cleanLegacy(row.role) };
  const hasCanonical = Boolean(
    row.sport_id || row.discipline_id || row.variant_id || row.player_role_id || row.staff_role_id,
  );

  if (hasCanonical) {
    if (!row.sport_id) {
      return { source: 'invalid_canonical', canonical: null, legacy, errors: ['canonical_sport_required'] };
    }
    const selection = toSelection(row);
    const errors = validateSelectionShape(selection, roleKind);
    if (errors.length) return { source: 'invalid_canonical', canonical: null, legacy, errors };
    const canonical = await catalog.getCanonical(selection);
    return canonical
      ? { source: 'canonical', canonical, legacy, errors: [] }
      : { source: 'invalid_canonical', canonical: null, legacy, errors: ['canonical_tuple_invalid'] };
  }

  if (!legacy.sport && !legacy.role) return { source: 'empty', canonical: null, legacy, errors: [] };
  const mapped = await catalog.resolveLegacy(legacy, roleKind);
  return mapped
    ? { source: 'mapped_legacy', canonical: mapped, legacy, errors: [] }
    : { source: 'raw_legacy', canonical: null, legacy, errors: [] };
}

export type TaxonomyWriteInput = {
  canonical?: CanonicalTaxonomySelection | null;
  legacy?: Partial<LegacyTaxonomyValue>;
};

export type TaxonomyWritePlan = {
  canonicalPatch: Partial<Pick<TaxonomyDatabaseRow, 'sport_id' | 'discipline_id' | 'variant_id' | 'player_role_id' | 'staff_role_id'>>;
  legacyPatch: Partial<LegacyTaxonomyValue>;
  source: 'absent' | 'canonical' | 'legacy_mapped' | 'legacy_raw' | 'clear_canonical';
};

export class TaxonomyCompatibilityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'TaxonomyCompatibilityError';
  }
}

export async function planTaxonomyWrite(
  input: TaxonomyWriteInput,
  roleKind: TaxonomyRoleKind,
  catalog: TaxonomyCatalog,
): Promise<TaxonomyWritePlan> {
  const hasCanonical = Object.prototype.hasOwnProperty.call(input, 'canonical');
  const hasLegacy = Object.prototype.hasOwnProperty.call(input, 'legacy');
  if (!hasCanonical && !hasLegacy) return { canonicalPatch: {}, legacyPatch: {}, source: 'absent' };

  const legacyPatch = hasLegacy ? cleanLegacyPatch(input.legacy ?? {}) : {};
  if (hasCanonical && input.canonical === null) {
    return { canonicalPatch: emptyCanonicalPatch(), legacyPatch, source: 'clear_canonical' };
  }

  if (input.canonical) {
    const errors = validateSelectionShape(input.canonical, roleKind);
    if (errors.length) throw new TaxonomyCompatibilityError(errors[0]);
    const canonical = await catalog.getCanonical(input.canonical);
    if (!canonical) throw new TaxonomyCompatibilityError('canonical_tuple_invalid');
    return {
      canonicalPatch: canonicalPatch(canonical),
      legacyPatch: hasLegacy ? legacyPatch : canonical.legacyProjection,
      source: 'canonical',
    };
  }

  const fullLegacy: LegacyTaxonomyValue = {
    sport: legacyPatch.sport ?? null,
    role: legacyPatch.role ?? null,
  };
  const mapped = await catalog.resolveLegacy(fullLegacy, roleKind);
  return mapped
    ? { canonicalPatch: canonicalPatch(mapped), legacyPatch, source: 'legacy_mapped' }
    : { canonicalPatch: {}, legacyPatch, source: 'legacy_raw' };
}

function validateSelectionShape(selection: CanonicalTaxonomySelection, roleKind: TaxonomyRoleKind): string[] {
  const errors: string[] = [];
  if (!selection.sportId) errors.push('canonical_sport_required');
  if (selection.variantId && !selection.disciplineId) errors.push('variant_requires_discipline');
  if (selection.playerRoleId && selection.staffRoleId) errors.push('role_kind_conflict');
  if (roleKind === 'player' && selection.staffRoleId) errors.push('staff_role_not_allowed');
  if (roleKind === 'staff' && selection.playerRoleId) errors.push('player_role_not_allowed');
  return errors;
}

function toSelection(row: TaxonomyDatabaseRow): CanonicalTaxonomySelection {
  return {
    sportId: row.sport_id as string,
    disciplineId: row.discipline_id,
    variantId: row.variant_id,
    playerRoleId: row.player_role_id,
    staffRoleId: row.staff_role_id,
  };
}

function canonicalPatch(selection: CanonicalTaxonomySelection) {
  return {
    sport_id: selection.sportId,
    discipline_id: selection.disciplineId,
    variant_id: selection.variantId,
    player_role_id: selection.playerRoleId,
    staff_role_id: selection.staffRoleId,
  };
}

function emptyCanonicalPatch() {
  return { sport_id: null, discipline_id: null, variant_id: null, player_role_id: null, staff_role_id: null };
}

function cleanLegacy(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function cleanLegacyPatch(value: Partial<LegacyTaxonomyValue>): Partial<LegacyTaxonomyValue> {
  const patch: Partial<LegacyTaxonomyValue> = {};
  if (Object.prototype.hasOwnProperty.call(value, 'sport')) patch.sport = cleanLegacy(value.sport);
  if (Object.prototype.hasOwnProperty.call(value, 'role')) patch.role = cleanLegacy(value.role);
  return patch;
}
