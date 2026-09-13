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

type OptionBase = { id: string; code: string; officialName: string; organizationId: string; sportId: string };
export type CompetitionLevelOption = OptionBase & {
  kind: 'competition_level'; countryId: string; levelRank: number | null;
  validFrom: string | null; validTo: string | null; displayOrder: number;
};
export type CompetitionOption = OptionBase & {
  kind: 'competition'; disciplineId: string | null; variantId: string | null; competitionType: null;
  primaryCountryId: string | null; countryIds: string[]; territorialScopeCode: string;
  geoAreaIds: string[]; activeEditionIds: string[];
};
export type MaterializedCompetitiveOption = CompetitionLevelOption | CompetitionOption;
export type MaterializedCompetitiveOptionResult =
  | { status: 'ok'; organizationId: string; options: MaterializedCompetitiveOption[] }
  | { status: 'invalid_query' | 'invalid_scope' | 'unsupported_country' | 'inactive_sport' | 'unavailable_organization' | 'overflow'; options: [] };

type ScopeSource = SportsTaxonomyScopeSource & {
  getCountry(id: string): Promise<CatalogParent | null>;
  getSport(id: string): Promise<CatalogParent | null>;
};
type CompetitionBatch = { options: CompetitionOption[]; linkedLevelIds: string[]; overflow: boolean };

export interface MaterializedCompetitiveOptionDataSource extends ScopeSource {
  isOrganizationAvailable(id: string, countryId: string, asOf: string): Promise<boolean>;
  listDirectLevels(query: { countryId: string; sportId: string; organizationId: string; asOf: string; fetchLimit: number }): Promise<CompetitionLevelOption[]>;
  listLevelsByIds(query: { ids: string[]; countryId: string; sportId: string; organizationId: string; asOf: string; fetchLimit: number }): Promise<CompetitionLevelOption[]>;
  listCompetitions(query: { countryId: string; sportId: string; organizationId: string; disciplineId: string | null; variantId: string | null; asOf: string; fetchLimit: number }): Promise<CompetitionBatch>;
}

type DbCompetition = { id: string; organization_id: string; sport_id: string; discipline_id: string | null; variant_id: string | null;
  code: string; canonical_name: string; primary_country_id: string | null; territorial_scope_code: string; default_level_id: string | null };
type DbLevel = { id: string; code: string; canonical_name: string; organization_id: string; sport_id: string; country_id: string;
  level_rank: number | null; valid_from: string | null; valid_to: string | null; display_order: number };

export class SupabaseMaterializedCompetitiveOptionDataSource implements MaterializedCompetitiveOptionDataSource {
  private readonly taxonomy: SupabaseMaterializedSportsOrganizationDataSource;
  constructor(private readonly client: SupabaseClient) { this.taxonomy = new SupabaseMaterializedSportsOrganizationDataSource(client); }
  getCountry(id: string) { return this.taxonomy.getCountry(id); }
  getSport(id: string) { return this.taxonomy.getSport(id); }
  getDiscipline(id: string): Promise<Discipline | null> { return this.taxonomy.getDiscipline(id); }
  getVariant(id: string): Promise<Variant | null> { return this.taxonomy.getVariant(id); }
  listActiveDisciplines(sportId: string, limit: number) { return this.taxonomy.listActiveDisciplines(sportId, limit); }
  listActiveVariants(disciplineId: string, limit: number) { return this.taxonomy.listActiveVariants(disciplineId, limit); }
  async isOrganizationAvailable(id: string, countryId: string, asOf: string) {
    return (await this.taxonomy.listActiveOrganizations([id], countryId, asOf)).some((item) => item.id === id);
  }

  private mapLevels(rows: DbLevel[]): CompetitionLevelOption[] {
    return rows.map((row) => ({ kind: 'competition_level', id: row.id, code: row.code, officialName: row.canonical_name,
      organizationId: row.organization_id, sportId: row.sport_id, countryId: row.country_id, levelRank: row.level_rank,
      validFrom: row.valid_from, validTo: row.valid_to, displayOrder: row.display_order }));
  }
  private levelQuery(query: { countryId: string; sportId: string; organizationId: string; asOf: string }) {
    return this.client.from('competition_levels')
      .select('id,code,canonical_name,organization_id,sport_id,country_id,level_rank,valid_from,valid_to,display_order')
      .eq('country_id', query.countryId).eq('sport_id', query.sportId).eq('organization_id', query.organizationId)
      .eq('is_active', true).or(`valid_from.is.null,valid_from.lte.${query.asOf}`).or(`valid_to.is.null,valid_to.gte.${query.asOf}`);
  }
  async listDirectLevels(query: { countryId: string; sportId: string; organizationId: string; asOf: string; fetchLimit: number }) {
    const { data, error } = await this.levelQuery(query).limit(query.fetchLimit);
    if (error) throw error;
    return this.mapLevels((data ?? []) as DbLevel[]);
  }
  async listLevelsByIds(query: { ids: string[]; countryId: string; sportId: string; organizationId: string; asOf: string; fetchLimit: number }) {
    if (query.ids.length === 0) return [];
    const { data, error } = await this.levelQuery(query).in('id', query.ids).limit(query.fetchLimit);
    if (error) throw error;
    return this.mapLevels((data ?? []) as DbLevel[]);
  }

  async listCompetitions(query: { countryId: string; sportId: string; organizationId: string; disciplineId: string | null; variantId: string | null; asOf: string; fetchLimit: number }): Promise<CompetitionBatch> {
    const select = 'id,organization_id,sport_id,discipline_id,variant_id,code,canonical_name,primary_country_id,territorial_scope_code,default_level_id';
    const scoped = (request: any, prefix = '') => {
      request = request.eq(`${prefix}organization_id`, query.organizationId).eq(`${prefix}sport_id`, query.sportId).eq(`${prefix}is_active`, true);
      request = query.disciplineId ? request.eq(`${prefix}discipline_id`, query.disciplineId) : request.is(`${prefix}discipline_id`, null);
      return query.variantId ? request.eq(`${prefix}variant_id`, query.variantId) : request.is(`${prefix}variant_id`, null);
    };
    const primaryRequest = scoped(this.client.from('competitions').select(select).eq('primary_country_id', query.countryId)).limit(query.fetchLimit);
    const linkedRequest = scoped(this.client.from('competition_countries').select(`competition_id,competitions!inner(${select})`).eq('country_id', query.countryId), 'competitions.').limit(query.fetchLimit);
    const [primary, linked] = await Promise.all([primaryRequest, linkedRequest]);
    if (primary.error) throw primary.error;
    if (linked.error) throw linked.error;
    type Linked = { competitions: DbCompetition | DbCompetition[] | null };
    const linkedRows = ((linked.data ?? []) as unknown as Linked[]).flatMap((row) => row.competitions ? [Array.isArray(row.competitions) ? row.competitions[0] : row.competitions] : []).filter(Boolean) as DbCompetition[];
    const byId = new Map<string, DbCompetition>();
    for (const row of [...((primary.data ?? []) as DbCompetition[]), ...linkedRows]) byId.set(row.id, row);
    if ((primary.data?.length ?? 0) >= query.fetchLimit || (linked.data?.length ?? 0) >= query.fetchLimit || byId.size >= query.fetchLimit)
      return { options: [], linkedLevelIds: [], overflow: true };

    const details = await Promise.all([...byId.values()].map(async (row) => {
      const [editions, countries, areas] = await Promise.all([
        this.client.from('competition_editions').select('id,level_id').eq('competition_id', row.id).eq('organization_id', query.organizationId)
          .eq('sport_id', query.sportId).eq('is_active', true).neq('status', 'cancelled')
          .or(`starts_on.is.null,starts_on.lte.${query.asOf}`).or(`ends_on.is.null,ends_on.gte.${query.asOf}`).limit(query.fetchLimit),
        this.client.from('competition_countries').select('country_id').eq('competition_id', row.id).limit(query.fetchLimit),
        this.client.from('competition_geo_areas').select('geo_area_id').eq('competition_id', row.id).limit(query.fetchLimit),
      ]);
      if (editions.error) throw editions.error; if (countries.error) throw countries.error; if (areas.error) throw areas.error;
      const overflow = [editions.data, countries.data, areas.data].some((items) => (items?.length ?? 0) >= query.fetchLimit);
      if (overflow || !editions.data?.length) return { overflow, option: null, linkedLevelIds: [] as string[] };
      const countryIds = [...new Set([...(row.primary_country_id ? [row.primary_country_id] : []), ...(countries.data ?? []).map((item) => item.country_id)])].sort();
      if (!countryIds.includes(query.countryId)) return { overflow: false, option: null, linkedLevelIds: [] as string[] };
      const activeEditionIds = [...new Set(editions.data.map((item) => item.id))].sort();
      const linkedLevelIds = [...new Set([...(row.default_level_id ? [row.default_level_id] : []), ...editions.data.flatMap((item) => item.level_id ? [item.level_id] : [])])];
      const option: CompetitionOption = { kind: 'competition', id: row.id, code: row.code, officialName: row.canonical_name,
        organizationId: row.organization_id, sportId: row.sport_id, disciplineId: row.discipline_id, variantId: row.variant_id,
        competitionType: null, primaryCountryId: row.primary_country_id, countryIds, territorialScopeCode: row.territorial_scope_code,
        geoAreaIds: [...new Set((areas.data ?? []).map((item) => item.geo_area_id))].sort(), activeEditionIds };
      return { overflow: false, option, linkedLevelIds };
    }));
    if (details.some((item) => item.overflow)) return { options: [], linkedLevelIds: [], overflow: true };
    return { options: details.flatMap((item) => item.option ? [item.option] : []),
      linkedLevelIds: [...new Set(details.flatMap((item) => item.linkedLevelIds))], overflow: false };
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
    const disciplineId = query.disciplineId?.trim() || null; const variantId = query.variantId?.trim() || null;
    const asOf = query.asOf ?? new Date().toISOString().slice(0, 10); const limit = query.limit ?? DEFAULT_COMPETITIVE_OPTION_LIMIT;
    if (!UUID.test(query.countryId) || !UUID.test(query.sportId) || !UUID.test(query.organizationId) ||
      (disciplineId !== null && !UUID.test(disciplineId)) || (variantId !== null && !UUID.test(variantId)) ||
      (variantId !== null && disciplineId === null) || !validDate(asOf) || !Number.isInteger(limit) || limit < 1 || limit > MAX_COMPETITIVE_OPTION_LIMIT)
      return { status: 'invalid_query', options: [] };
    const country = await this.source.getCountry(query.countryId);
    if (!country?.isActive || !country.isSupported) return { status: 'unsupported_country', options: [] };
    const sport = await this.source.getSport(query.sportId);
    if (!sport?.isActive) return { status: 'inactive_sport', options: [] };
    const scope = await resolveSportsTaxonomyScope(this.source, query.sportId, disciplineId, variantId);
    if (!scope) return { status: 'invalid_scope', options: [] };
    if (!await this.source.isOrganizationAvailable(query.organizationId, query.countryId, asOf)) return { status: 'unavailable_organization', options: [] };
    const fetchLimit = limit + 1;
    const competitions = await this.source.listCompetitions({ ...query, disciplineId: scope.disciplineId, variantId: scope.variantId, asOf, fetchLimit });
    if (competitions.overflow || competitions.options.length > limit || competitions.linkedLevelIds.length > limit) return { status: 'overflow', options: [] };
    const levels = scope.disciplineId === null && scope.variantId === null
      ? await this.source.listDirectLevels({ ...query, asOf, fetchLimit })
      : await this.source.listLevelsByIds({ ids: competitions.linkedLevelIds, ...query, asOf, fetchLimit });
    if (levels.length > limit) return { status: 'overflow', options: [] };
    const options = [...new Map< string, MaterializedCompetitiveOption>([...levels, ...competitions.options].map((item) => [`${item.kind}:${item.id}`, item])).values()];
    options.sort((a, b) => a.kind.localeCompare(b.kind) || a.officialName.localeCompare(b.officialName, 'und') || a.id.localeCompare(b.id));
    if (options.length > limit) return { status: 'overflow', options: [] };
    return { status: 'ok', organizationId: query.organizationId, options };
  }
}
