import type { SupabaseClient } from '@supabase/supabase-js';

import {
  resolveCanonicalSportsReference,
  type CanonicalSportsReadResolution,
  type LegacyCatalogMatch,
} from './canonicalSportsCompatibility';
import { normalizeLegacyTaxonomyValue } from './legacyMappings';

export type SportCatalogRow = {
  id: string;
  code: string;
  canonicalName: string;
  isActive: boolean;
};

export type DisciplineCatalogRow = SportCatalogRow & {
  sportId: string;
  isIndependentlySelectable: boolean;
};

export type VariantCatalogRow = SportCatalogRow & {
  disciplineId: string;
  teamSize: number | null;
};

export type SportDisciplineVariantReference = {
  sportId: string;
  disciplineId?: string | null;
  variantId?: string | null;
};

export type SportDisciplineVariantContext = {
  id: string;
  isActive: boolean;
  sport: SportCatalogRow;
  discipline: DisciplineCatalogRow | null;
  variant: VariantCatalogRow | null;
};

export type LegacySportMappingRow = SportDisciplineVariantReference & {
  normalizedSourceValue: string;
  legacyDisplayLabel: string;
};

export interface SportsTaxonomyDataSource {
  getSport(id: string): Promise<SportCatalogRow | null>;
  getDiscipline(id: string): Promise<DisciplineCatalogRow | null>;
  getVariant(id: string): Promise<VariantCatalogRow | null>;
  findActiveLegacyMappings(normalizedSourceValue: string, limit: number): Promise<LegacySportMappingRow[]>;
  findActiveLegacyProjectionLabels(
    reference: SportDisciplineVariantReference,
    limit: number,
  ): Promise<{ labels: string[]; totalCount: number }>;
}

type DbSportRow = { id: string; code: string; canonical_name: string; is_active: boolean };
type DbDisciplineRow = DbSportRow & {
  sport_id: string;
  is_independently_selectable: boolean;
};
type DbVariantRow = DbSportRow & { discipline_id: string; team_size: number | null };
type DbLegacyMappingRow = {
  normalized_source_value: string;
  legacy_display_label: string;
  sport_id: string;
  discipline_id: string | null;
  variant_id: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SPORT_SELECT = 'id,code,canonical_name,is_active';
const DISCIPLINE_SELECT = `${SPORT_SELECT},sport_id,is_independently_selectable`;
const VARIANT_SELECT = `${SPORT_SELECT},discipline_id,team_size`;

const mapSport = (row: DbSportRow): SportCatalogRow => ({
  id: row.id,
  code: row.code,
  canonicalName: row.canonical_name,
  isActive: row.is_active,
});

const mapDiscipline = (row: DbDisciplineRow): DisciplineCatalogRow => ({
  ...mapSport(row),
  sportId: row.sport_id,
  isIndependentlySelectable: row.is_independently_selectable,
});

const mapVariant = (row: DbVariantRow): VariantCatalogRow => ({
  ...mapSport(row),
  disciplineId: row.discipline_id,
  teamSize: row.team_size,
});

/** Supabase access is read-only and every query is exact-ID or limited to two mapping rows. */
export class SupabaseSportsTaxonomyDataSource implements SportsTaxonomyDataSource {
  constructor(private readonly client: SupabaseClient) {}

  async getSport(id: string): Promise<SportCatalogRow | null> {
    const { data, error } = await this.client.from('sports').select(SPORT_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapSport(data as DbSportRow) : null;
  }

  async getDiscipline(id: string): Promise<DisciplineCatalogRow | null> {
    const { data, error } = await this.client
      .from('sport_disciplines')
      .select(DISCIPLINE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDiscipline(data as DbDisciplineRow) : null;
  }

  async getVariant(id: string): Promise<VariantCatalogRow | null> {
    const { data, error } = await this.client
      .from('sport_variants')
      .select(VARIANT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVariant(data as DbVariantRow) : null;
  }

  async findActiveLegacyMappings(normalizedSourceValue: string, limit: number): Promise<LegacySportMappingRow[]> {
    const { data, error } = await this.client
      .from('legacy_sport_mappings')
      .select('normalized_source_value,legacy_display_label,sport_id,discipline_id,variant_id')
      .eq('normalized_source_value', normalizedSourceValue)
      .eq('is_active', true)
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as DbLegacyMappingRow[]).map((row) => ({
      normalizedSourceValue: row.normalized_source_value,
      legacyDisplayLabel: row.legacy_display_label,
      sportId: row.sport_id,
      disciplineId: row.discipline_id,
      variantId: row.variant_id,
    }));
  }

  async findActiveLegacyProjectionLabels(
    reference: SportDisciplineVariantReference,
    limit: number,
  ): Promise<{ labels: string[]; totalCount: number }> {
    let query = this.client
      .from('legacy_sport_mappings')
      .select('legacy_display_label', { count: 'exact' })
      .eq('sport_id', reference.sportId)
      .eq('is_active', true);
    query = reference.disciplineId
      ? query.eq('discipline_id', reference.disciplineId)
      : query.is('discipline_id', null);
    query = reference.variantId ? query.eq('variant_id', reference.variantId) : query.is('variant_id', null);
    const { data, error, count } = await query.limit(limit);
    if (error) throw error;
    return {
      labels: (data ?? []).flatMap((row) => typeof row.legacy_display_label === 'string' ? [row.legacy_display_label] : []),
      totalCount: count ?? 0,
    };
  }
}

const contextKey = ({ sportId, disciplineId, variantId }: SportDisciplineVariantReference): string =>
  [sportId, disciplineId ?? '', variantId ?? ''].join(':');

const validReferenceShape = ({ sportId, disciplineId, variantId }: SportDisciplineVariantReference): boolean =>
  UUID_PATTERN.test(sportId) &&
  (!disciplineId || UUID_PATTERN.test(disciplineId)) &&
  (!variantId || UUID_PATTERN.test(variantId)) &&
  (!variantId || Boolean(disciplineId));

export type ResolveSportsTaxonomyInput = {
  canonical?: Partial<SportDisciplineVariantReference> | null;
  legacyValue?: string | null;
};

/** Internal bounded repository adapter; it does not expose a route or perform writes. */
export class SportsTaxonomyRepository {
  constructor(private readonly source: SportsTaxonomyDataSource) {}

  async getContext(reference: SportDisciplineVariantReference): Promise<SportDisciplineVariantContext | null> {
    if (!validReferenceShape(reference)) return null;
    const sport = await this.source.getSport(reference.sportId);
    if (!sport) return null;

    const discipline = reference.disciplineId
      ? await this.source.getDiscipline(reference.disciplineId)
      : null;
    if (reference.disciplineId && (!discipline || discipline.sportId !== sport.id)) return null;

    const variant = reference.variantId ? await this.source.getVariant(reference.variantId) : null;
    if (reference.variantId && (!variant || variant.disciplineId !== discipline?.id)) return null;

    return {
      id: contextKey(reference),
      isActive: sport.isActive && (discipline?.isActive ?? true) && (variant?.isActive ?? true),
      sport,
      discipline,
      variant,
    };
  }

  async getStableLegacyProjection(
    context: SportDisciplineVariantContext,
    maxMappings = 32,
  ): Promise<{ status: 'unique' | 'none' | 'ambiguous' | 'overflow'; value: string | null }> {
    const result = await this.source.findActiveLegacyProjectionLabels({
      sportId: context.sport.id,
      disciplineId: context.discipline?.id,
      variantId: context.variant?.id,
    }, maxMappings + 1);
    if (result.totalCount > maxMappings) return { status: 'overflow', value: null };
    const labels = [...new Set(result.labels.map((label) => label.trim()).filter(Boolean))];
    if (!labels.length) return { status: 'none', value: null };
    if (labels.length > 1) return { status: 'ambiguous', value: null };
    return { status: 'unique', value: labels[0] };
  }

  async resolve(input: ResolveSportsTaxonomyInput): Promise<CanonicalSportsReadResolution<SportDisciplineVariantContext>> {
    const legacyValue = input.legacyValue?.trim() || null;
    const canonical = input.canonical ?? null;
    const hasCanonical = Boolean(canonical && Object.values(canonical).some((value) => value != null));
    const canonicalReference = hasCanonical && typeof canonical?.sportId === 'string'
      ? {
          sportId: canonical.sportId,
          disciplineId: canonical.disciplineId,
          variantId: canonical.variantId,
        }
      : null;
    const canonicalContext = canonicalReference ? await this.getContext(canonicalReference) : null;

    const mappingRows = !hasCanonical && legacyValue
      ? await this.source.findActiveLegacyMappings(normalizeLegacyTaxonomyValue(legacyValue), 2)
      : [];
    if (mappingRows.length > 1) {
      return {
        status: 'ambiguous',
        canonical: null,
        legacyValue,
        displayFallback: legacyValue,
      };
    }
    const legacyMatches: LegacyCatalogMatch<SportDisciplineVariantContext>[] = [];
    for (const mapping of mappingRows) {
      const mappedContext = await this.getContext(mapping);
      if (mappedContext) {
        legacyMatches.push({ canonical: mappedContext, normalizedLegacyValue: mapping.legacyDisplayLabel });
      }
    }

    const canonicalId = hasCanonical
      ? canonicalReference ? contextKey(canonicalReference) : 'invalid-canonical-shape'
      : null;
    return resolveCanonicalSportsReference(
      { canonicalId, legacyValue },
      {
        findCanonicalById: (id) => id === canonicalContext?.id ? canonicalContext : null,
        findLegacyMatches: () => legacyMatches,
        isCoherentHistoricalReference: () => true,
      },
    );
  }
}
