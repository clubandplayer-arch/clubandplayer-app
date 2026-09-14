import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SPORTS_ORGANIZATION_LIMIT = 100;
export const MAX_SPORTS_ORGANIZATION_LIMIT = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MaterializedSportsOrganizationQuery = {
  countryId: string;
  sportId: string;
  disciplineId?: string;
  variantId?: string;
  asOf?: string;
  limit?: number;
};

export type MaterializedSportsOrganization = {
  id: string;
  code: string;
  officialName: string;
  organizationType: string;
  parentId: string | null;
  primaryCountryId: string | null;
  countryIds: string[];
  validFrom: string | null;
  validTo: string | null;
};

export type MaterializedSportsOrganizationResult =
  | { status: 'ok'; derivation: 'materialized_options'; organizations: MaterializedSportsOrganization[] }
  | { status: 'invalid_query' | 'invalid_scope' | 'unsupported_country' | 'inactive_sport' | 'overflow'; organizations: [] };

export type CatalogParent = { id: string; isActive: boolean; isSupported?: boolean };
export type Discipline = CatalogParent & { sportId: string };
export type Variant = CatalogParent & { disciplineId: string };
export type SportsTaxonomyScopeSource = Pick<MaterializedSportsOrganizationDataSource,
  'getDiscipline' | 'getVariant' | 'listActiveDisciplines' | 'listActiveVariants'>;
export type ResolvedSportsTaxonomyScope = { disciplineId: string | null; variantId: string | null };
type CategoryCandidateQuery = {
  countryId: string;
  sportId: string;
  disciplineId: string | null;
  variantId: string | null;
};
type CategoryOrganizationBatch = { organizationIds: string[]; overflow: boolean };

export interface MaterializedSportsOrganizationDataSource {
  getCountry(id: string): Promise<CatalogParent | null>;
  getSport(id: string): Promise<CatalogParent | null>;
  getDiscipline(id: string): Promise<Discipline | null>;
  getVariant(id: string): Promise<Variant | null>;
  listActiveDisciplines(sportId: string, limit: number): Promise<Discipline[]>;
  listActiveVariants(disciplineId: string, limit: number): Promise<Variant[]>;
  listCategoryOrganizationIds(query: CategoryCandidateQuery): Promise<CategoryOrganizationBatch>;
  listActiveOrganizations(ids: string[], countryId: string, asOf: string): Promise<MaterializedSportsOrganization[]>;
}

type DbOrganization = {
  id: string; code: string; canonical_name: string; organization_type: string; parent_id: string | null;
  primary_country_id: string | null; valid_from: string | null; valid_to: string | null;
};

/** Read-only adapter. Each option-family lookup is independently bounded. */
export class SupabaseMaterializedSportsOrganizationDataSource implements MaterializedSportsOrganizationDataSource {
  constructor(private readonly client: SupabaseClient) {}

  async getCountry(id: string): Promise<CatalogParent | null> {
    const { data, error } = await this.client.from('countries').select('id,is_active,is_supported').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, isActive: data.is_active, isSupported: data.is_supported } : null;
  }

  async getSport(id: string): Promise<CatalogParent | null> {
    const { data, error } = await this.client.from('sports').select('id,is_active').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, isActive: data.is_active } : null;
  }

  async getDiscipline(id: string): Promise<Discipline | null> {
    const { data, error } = await this.client.from('sport_disciplines').select('id,sport_id,is_active').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, sportId: data.sport_id, isActive: data.is_active } : null;
  }

  async getVariant(id: string): Promise<Variant | null> {
    const { data, error } = await this.client.from('sport_variants').select('id,discipline_id,is_active').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, disciplineId: data.discipline_id, isActive: data.is_active } : null;
  }

  async listActiveDisciplines(sportId: string, limit: number): Promise<Discipline[]> {
    const { data, error } = await this.client.from('sport_disciplines').select('id,sport_id,is_active')
      .eq('sport_id', sportId).eq('is_active', true).eq('is_independently_selectable', true)
      .order('display_order').limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, sportId: row.sport_id, isActive: row.is_active }));
  }

  async listActiveVariants(disciplineId: string, limit: number): Promise<Variant[]> {
    const { data, error } = await this.client.from('sport_variants').select('id,discipline_id,is_active')
      .eq('discipline_id', disciplineId).eq('is_active', true).order('display_order').limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, disciplineId: row.discipline_id, isActive: row.is_active }));
  }

  async listCategoryOrganizationIds(query: CategoryCandidateQuery): Promise<CategoryOrganizationBatch> {
    let request = this.client.from('sports_organization_categories').select('organization_id')
      .eq('country_id', query.countryId).eq('sport_id', query.sportId).eq('is_active', true);
    request = query.disciplineId ? request.eq('discipline_id', query.disciplineId) : request.is('discipline_id', null);
    request = query.variantId ? request.eq('variant_id', query.variantId) : request.is('variant_id', null);
    // The row scan has its own hard cap: limiting by the requested organization
    // count before de-duplication could hide a later organization behind many
    // categories owned by the first one.
    const { data, error } = await request.limit(MAX_SPORTS_ORGANIZATION_LIMIT + 1);
    if (error) throw error;
    if ((data?.length ?? 0) > MAX_SPORTS_ORGANIZATION_LIMIT) return { organizationIds: [], overflow: true };
    return { organizationIds: (data ?? []).map((row) => row.organization_id), overflow: false };
  }

  async listActiveOrganizations(ids: string[], countryId: string, asOf: string): Promise<MaterializedSportsOrganization[]> {
    if (ids.length === 0) return [];
    const [organizations, countries] = await Promise.all([
      this.client.from('sports_organizations')
        .select('id,code,canonical_name,organization_type,parent_id,primary_country_id,valid_from,valid_to')
        .in('id', ids).eq('is_active', true).or(`valid_from.is.null,valid_from.lte.${asOf}`)
        .or(`valid_to.is.null,valid_to.gte.${asOf}`).limit(MAX_SPORTS_ORGANIZATION_LIMIT + 1),
      Promise.all(ids.map(async (organizationId) => {
        const result = await this.client.from('sports_organization_countries').select('organization_id,country_id')
          .eq('organization_id', organizationId).limit(MAX_SPORTS_ORGANIZATION_LIMIT + 1);
        if (result.error) throw result.error;
        if ((result.data?.length ?? 0) > MAX_SPORTS_ORGANIZATION_LIMIT) throw new Error('Organization country scope overflow');
        return result.data ?? [];
      })),
    ]);
    if (organizations.error) throw organizations.error;
    const byOrganization = new Map<string, string[]>();
    for (const row of countries.flat()) byOrganization.set(row.organization_id, [...(byOrganization.get(row.organization_id) ?? []), row.country_id]);
    return ((organizations.data ?? []) as DbOrganization[]).flatMap((row) => {
      const countryIds = [...new Set([...(row.primary_country_id ? [row.primary_country_id] : []), ...(byOrganization.get(row.id) ?? [])])].sort();
      if (row.primary_country_id !== countryId && !countryIds.includes(countryId)) return [];
      return [{ id: row.id, code: row.code, officialName: row.canonical_name, organizationType: row.organization_type,
        parentId: row.parent_id, primaryCountryId: row.primary_country_id, countryIds,
        validFrom: row.valid_from, validTo: row.valid_to }];
    });
  }
}

const validDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

export async function resolveSportsTaxonomyScope(
  source: SportsTaxonomyScopeSource,
  sportId: string,
  disciplineId: string | null,
  variantId: string | null,
): Promise<ResolvedSportsTaxonomyScope | null> {
  if (disciplineId) {
    const discipline = await source.getDiscipline(disciplineId);
    if (!discipline?.isActive || discipline.sportId !== sportId) return null;
  }
  if (variantId) {
    const variant = await source.getVariant(variantId);
    if (!variant?.isActive || variant.disciplineId !== disciplineId) return null;
  }
  let effectiveDisciplineId = disciplineId;
  if (!effectiveDisciplineId) {
    const disciplines = await source.listActiveDisciplines(sportId, 2);
    if (disciplines.length > 1) return null;
    effectiveDisciplineId = disciplines[0]?.id ?? null;
  }
  let effectiveVariantId = variantId;
  if (effectiveDisciplineId && !effectiveVariantId) {
    const variants = await source.listActiveVariants(effectiveDisciplineId, 2);
    if (variants.length > 1) return null;
    effectiveVariantId = variants[0]?.id ?? null;
  }
  return { disciplineId: effectiveDisciplineId, variantId: effectiveVariantId };
}

export class MaterializedSportsOrganizationRepository {
  constructor(private readonly source: MaterializedSportsOrganizationDataSource) {}

  async list(query: MaterializedSportsOrganizationQuery): Promise<MaterializedSportsOrganizationResult> {
    const disciplineId = query.disciplineId?.trim() || null;
    const variantId = query.variantId?.trim() || null;
    const asOf = query.asOf ?? new Date().toISOString().slice(0, 10);
    const limit = query.limit ?? DEFAULT_SPORTS_ORGANIZATION_LIMIT;
    if (!UUID.test(query.countryId) || !UUID.test(query.sportId) || (disciplineId !== null && !UUID.test(disciplineId)) ||
      (variantId !== null && !UUID.test(variantId)) || (variantId !== null && disciplineId === null) || !validDate(asOf) ||
      !Number.isInteger(limit) || limit < 1 || limit > MAX_SPORTS_ORGANIZATION_LIMIT) {
      return { status: 'invalid_query', organizations: [] };
    }
    const country = await this.source.getCountry(query.countryId);
    if (!country?.isActive || !country.isSupported) return { status: 'unsupported_country', organizations: [] };
    const sport = await this.source.getSport(query.sportId);
    if (!sport?.isActive) return { status: 'inactive_sport', organizations: [] };
    const scope = await resolveSportsTaxonomyScope(this.source, query.sportId, disciplineId, variantId);
    if (!scope) return { status: 'invalid_scope', organizations: [] };
    const { disciplineId: effectiveDisciplineId, variantId: effectiveVariantId } = scope;
    const categoryBatch = await this.source.listCategoryOrganizationIds({
      countryId: query.countryId,
      sportId: query.sportId,
      disciplineId: effectiveDisciplineId,
      variantId: effectiveVariantId,
    });
    if (categoryBatch.overflow) return { status: 'overflow', organizations: [] };
    const candidateIds = [...new Set(categoryBatch.organizationIds)];
    if (candidateIds.length > limit) return { status: 'overflow', organizations: [] };
    const organizations = await this.source.listActiveOrganizations(candidateIds, query.countryId, asOf);
    organizations.sort((a, b) => a.officialName.localeCompare(b.officialName, 'und') || a.id.localeCompare(b.id));
    if (organizations.length > limit) return { status: 'overflow', organizations: [] };
    return { status: 'ok', derivation: 'materialized_options', organizations };
  }
}
