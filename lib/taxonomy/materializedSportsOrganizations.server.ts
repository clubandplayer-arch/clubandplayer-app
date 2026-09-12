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

type CatalogParent = { id: string; isActive: boolean; isSupported?: boolean };
type Discipline = CatalogParent & { sportId: string };
type Variant = CatalogParent & { disciplineId: string };
type OrganizationCandidateQuery = { countryId: string; sportId: string; asOf: string; fetchLimit: number };
type CompetitionCandidateQuery = OrganizationCandidateQuery & { disciplineId: string | null; variantId: string | null };

export interface MaterializedSportsOrganizationDataSource {
  getCountry(id: string): Promise<CatalogParent | null>;
  getSport(id: string): Promise<CatalogParent | null>;
  getDiscipline(id: string): Promise<Discipline | null>;
  getVariant(id: string): Promise<Variant | null>;
  listActiveDisciplines(sportId: string, limit: number): Promise<Discipline[]>;
  listActiveVariants(disciplineId: string, limit: number): Promise<Variant[]>;
  listLevelOrganizationIds(query: OrganizationCandidateQuery): Promise<string[]>;
  listCompetitionOrganizationIds(query: CompetitionCandidateQuery): Promise<string[]>;
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

  async listLevelOrganizationIds(query: OrganizationCandidateQuery): Promise<string[]> {
    const { data, error } = await this.client.from('competition_levels').select('organization_id').eq('country_id', query.countryId)
      .eq('sport_id', query.sportId).eq('is_active', true).or(`valid_from.is.null,valid_from.lte.${query.asOf}`)
      .or(`valid_to.is.null,valid_to.gte.${query.asOf}`).limit(query.fetchLimit);
    if (error) throw error;
    return (data ?? []).map((row) => row.organization_id);
  }

  async listCompetitionOrganizationIds(query: CompetitionCandidateQuery): Promise<string[]> {
    let primaryRequest = this.client.from('competitions').select('id,organization_id,competition_editions!inner(id)')
      .eq('sport_id', query.sportId).eq('is_active', true).eq('primary_country_id', query.countryId)
      .eq('competition_editions.is_active', true).neq('competition_editions.status', 'cancelled')
      .or(`starts_on.is.null,starts_on.lte.${query.asOf}`, { referencedTable: 'competition_editions' })
      .or(`ends_on.is.null,ends_on.gte.${query.asOf}`, { referencedTable: 'competition_editions' });
    primaryRequest = query.disciplineId
      ? primaryRequest.eq('discipline_id', query.disciplineId)
      : primaryRequest.is('discipline_id', null);
    primaryRequest = query.variantId
      ? primaryRequest.eq('variant_id', query.variantId)
      : primaryRequest.is('variant_id', null);
    let linkedRequest = this.client.from('competition_countries')
      .select('competition_id,competitions!inner(id,organization_id,sport_id,discipline_id,variant_id,is_active,competition_editions!inner(id,is_active,status,starts_on,ends_on))')
      .eq('country_id', query.countryId).eq('competitions.sport_id', query.sportId).eq('competitions.is_active', true);
    linkedRequest = linkedRequest.eq('competitions.competition_editions.is_active', true)
      .neq('competitions.competition_editions.status', 'cancelled')
      .or(`starts_on.is.null,starts_on.lte.${query.asOf}`, { referencedTable: 'competitions.competition_editions' })
      .or(`ends_on.is.null,ends_on.gte.${query.asOf}`, { referencedTable: 'competitions.competition_editions' });
    linkedRequest = query.disciplineId
      ? linkedRequest.eq('competitions.discipline_id', query.disciplineId)
      : linkedRequest.is('competitions.discipline_id', null);
    linkedRequest = query.variantId
      ? linkedRequest.eq('competitions.variant_id', query.variantId)
      : linkedRequest.is('competitions.variant_id', null);
    const [primary, linked] = await Promise.all([
      primaryRequest.limit(query.fetchLimit), linkedRequest.limit(query.fetchLimit),
    ]);
    if (primary.error) throw primary.error;
    if (linked.error) throw linked.error;
    type LinkedCompetition = { organization_id: string; discipline_id: string | null; variant_id: string | null };
    type LinkedRow = { competitions: LinkedCompetition | LinkedCompetition[] | null };
    const linkedIds = new Set(((linked.data ?? []) as unknown as LinkedRow[]).flatMap((row) => {
      const competition = Array.isArray(row.competitions) ? row.competitions[0] : row.competitions;
      if (!competition) return [];
      const exactDiscipline = query.disciplineId ? competition.discipline_id === query.disciplineId : competition.discipline_id === null;
      const exactVariant = query.variantId ? competition.variant_id === query.variantId : competition.variant_id === null;
      return exactDiscipline && exactVariant ? [competition.organization_id] : [];
    }));
    return [...(primary.data ?? []).map((row: { organization_id: string }) => row.organization_id), ...linkedIds];
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
    if (disciplineId) {
      const discipline = await this.source.getDiscipline(disciplineId);
      if (!discipline?.isActive || discipline.sportId !== query.sportId) return { status: 'invalid_scope', organizations: [] };
    }
    if (variantId) {
      const variant = await this.source.getVariant(variantId);
      if (!variant?.isActive || variant.disciplineId !== disciplineId) return { status: 'invalid_scope', organizations: [] };
    }

    let effectiveDisciplineId = disciplineId;
    if (!effectiveDisciplineId) {
      const disciplines = await this.source.listActiveDisciplines(query.sportId, 2);
      if (disciplines.length > 1) return { status: 'invalid_scope', organizations: [] };
      effectiveDisciplineId = disciplines[0]?.id ?? null;
    }
    let effectiveVariantId = variantId;
    if (effectiveDisciplineId && !effectiveVariantId) {
      const variants = await this.source.listActiveVariants(effectiveDisciplineId, 2);
      if (variants.length > 1) return { status: 'invalid_scope', organizations: [] };
      effectiveVariantId = variants[0]?.id ?? null;
    }
    const candidateQuery = { countryId: query.countryId, sportId: query.sportId, asOf, fetchLimit: limit + 1 };
    const [levels, competitions] = await Promise.all([
      effectiveDisciplineId ? Promise.resolve([]) : this.source.listLevelOrganizationIds(candidateQuery),
      this.source.listCompetitionOrganizationIds({ ...candidateQuery, disciplineId: effectiveDisciplineId, variantId: effectiveVariantId }),
    ]);
    if (levels.length > limit || competitions.length > limit) return { status: 'overflow', organizations: [] };
    // age_classes are intentionally excluded: they have neither country nor
    // discipline/variant applicability in the current schema.
    const candidateIds = [...new Set([...levels, ...competitions])];
    if (candidateIds.length > limit) return { status: 'overflow', organizations: [] };
    const organizations = await this.source.listActiveOrganizations(candidateIds, query.countryId, asOf);
    organizations.sort((a, b) => a.officialName.localeCompare(b.officialName, 'und') || a.id.localeCompare(b.id));
    if (organizations.length > limit) return { status: 'overflow', organizations: [] };
    return { status: 'ok', derivation: 'materialized_options', organizations };
  }
}
