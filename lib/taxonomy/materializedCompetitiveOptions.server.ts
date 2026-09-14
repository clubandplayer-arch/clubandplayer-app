import type { SupabaseClient } from '@supabase/supabase-js';

import {
  SupabaseMaterializedSportsOrganizationDataSource,
  resolveSportsTaxonomyScope,
  type CatalogParent,
  type Discipline,
  type SportsTaxonomyScopeSource,
  type Variant,
} from './materializedSportsOrganizations.server';

export const DEFAULT_COMPETITIVE_OPTION_LIMIT = 100;
export const MAX_COMPETITIVE_OPTION_LIMIT = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MaterializedCompetitiveOptionQuery = {
  countryId: string;
  sportId: string;
  organizationId: string;
  disciplineId?: string;
  variantId?: string;
  asOf?: string;
  limit?: number;
};

export type OrganizationCategoryOption = {
  kind: 'organization_category';
  id: string;
  code: string;
  officialName: string;
};

export type MaterializedCompetitiveOption = OrganizationCategoryOption;
export type MaterializedCompetitiveOptionResult =
  | { status: 'ok'; organizationId: string; options: OrganizationCategoryOption[] }
  | { status: 'invalid_query' | 'invalid_scope' | 'unsupported_country' | 'inactive_sport' | 'unavailable_organization' | 'overflow'; options: [] };

type ScopeSource = SportsTaxonomyScopeSource & {
  getCountry(id: string): Promise<CatalogParent | null>;
  getSport(id: string): Promise<CatalogParent | null>;
};

type CategoryQuery = {
  countryId: string;
  sportId: string;
  organizationId: string;
  disciplineId: string | null;
  variantId: string | null;
  fetchLimit: number;
};

export interface MaterializedCompetitiveOptionDataSource extends ScopeSource {
  isOrganizationAvailable(id: string, countryId: string, asOf: string): Promise<boolean>;
  listCategories(query: CategoryQuery): Promise<OrganizationCategoryOption[]>;
}

type DbCategory = { id: string; code: string; canonical_name: string };

export class SupabaseMaterializedCompetitiveOptionDataSource implements MaterializedCompetitiveOptionDataSource {
  private readonly taxonomy: SupabaseMaterializedSportsOrganizationDataSource;

  constructor(private readonly client: SupabaseClient) {
    this.taxonomy = new SupabaseMaterializedSportsOrganizationDataSource(client);
  }

  getCountry(id: string) { return this.taxonomy.getCountry(id); }
  getSport(id: string) { return this.taxonomy.getSport(id); }
  getDiscipline(id: string): Promise<Discipline | null> { return this.taxonomy.getDiscipline(id); }
  getVariant(id: string): Promise<Variant | null> { return this.taxonomy.getVariant(id); }
  listActiveDisciplines(sportId: string, limit: number) { return this.taxonomy.listActiveDisciplines(sportId, limit); }
  listActiveVariants(disciplineId: string, limit: number) { return this.taxonomy.listActiveVariants(disciplineId, limit); }

  async isOrganizationAvailable(id: string, countryId: string, asOf: string) {
    return (await this.taxonomy.listActiveOrganizations([id], countryId, asOf)).some((item) => item.id === id);
  }

  async listCategories(query: CategoryQuery): Promise<OrganizationCategoryOption[]> {
    let request = this.client.from('sports_organization_categories').select('id,code,canonical_name')
      .eq('organization_id', query.organizationId).eq('country_id', query.countryId)
      .eq('sport_id', query.sportId).eq('is_active', true);
    request = query.disciplineId ? request.eq('discipline_id', query.disciplineId) : request.is('discipline_id', null);
    request = query.variantId ? request.eq('variant_id', query.variantId) : request.is('variant_id', null);
    const { data, error } = await request.order('display_order').order('canonical_name').order('id').limit(query.fetchLimit);
    if (error) throw error;
    return ((data ?? []) as DbCategory[]).map((row) => ({
      kind: 'organization_category', id: row.id, code: row.code, officialName: row.canonical_name,
    }));
  }
}

const validDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

export class MaterializedCompetitiveOptionRepository {
  constructor(private readonly source: MaterializedCompetitiveOptionDataSource) {}

  async list(query: MaterializedCompetitiveOptionQuery): Promise<MaterializedCompetitiveOptionResult> {
    const disciplineId = query.disciplineId?.trim() || null;
    const variantId = query.variantId?.trim() || null;
    const asOf = query.asOf ?? new Date().toISOString().slice(0, 10);
    const limit = query.limit ?? DEFAULT_COMPETITIVE_OPTION_LIMIT;
    if (!UUID.test(query.countryId) || !UUID.test(query.sportId) || !UUID.test(query.organizationId) ||
      (disciplineId !== null && !UUID.test(disciplineId)) || (variantId !== null && !UUID.test(variantId)) ||
      (variantId !== null && disciplineId === null) || !validDate(asOf) || !Number.isInteger(limit) ||
      limit < 1 || limit > MAX_COMPETITIVE_OPTION_LIMIT) {
      return { status: 'invalid_query', options: [] };
    }
    const country = await this.source.getCountry(query.countryId);
    if (!country?.isActive || !country.isSupported) return { status: 'unsupported_country', options: [] };
    const sport = await this.source.getSport(query.sportId);
    if (!sport?.isActive) return { status: 'inactive_sport', options: [] };
    const scope = await resolveSportsTaxonomyScope(this.source, query.sportId, disciplineId, variantId);
    if (!scope) return { status: 'invalid_scope', options: [] };
    if (!await this.source.isOrganizationAvailable(query.organizationId, query.countryId, asOf)) {
      return { status: 'unavailable_organization', options: [] };
    }
    const options = await this.source.listCategories({
      countryId: query.countryId,
      sportId: query.sportId,
      organizationId: query.organizationId,
      disciplineId: scope.disciplineId,
      variantId: scope.variantId,
      fetchLimit: limit + 1,
    });
    if (options.length > limit) return { status: 'overflow', options: [] };
    return { status: 'ok', organizationId: query.organizationId, options };
  }
}
