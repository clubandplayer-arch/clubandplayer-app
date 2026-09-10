import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_COMPETITION_LEVEL_LIMIT = 100;
export const MAX_COMPETITION_LEVEL_LIMIT = 200;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type CompetitionLevelQuery = {
  countryId: string;
  sportId: string;
  organizationId?: string;
  asOf?: string;
  limit?: number;
};

export type CompetitionLevelOption = {
  id: string;
  code: string;
  officialName: string;
  levelRank: number | null;
  organizationId: string;
  countryId: string;
  validFrom: string | null;
  validTo: string | null;
};

export type CompetitionLevelQueryResult =
  | { status: 'ok'; options: CompetitionLevelOption[] }
  | { status: 'invalid_query' | 'unsupported_country' | 'inactive_sport' | 'organization_not_in_country' | 'overflow'; options: [] };

export type CompetitionLevelCountry = {
  id: string;
  isActive: boolean;
  isSupported: boolean;
};

export type CompetitionLevelSport = {
  id: string;
  isActive: boolean;
};

export type CompetitionLevelOrganization = {
  id: string;
  isActive: boolean;
  primaryCountryId: string | null;
  countryIds: string[];
};

export interface CompetitionLevelDataSource {
  getCountry(id: string): Promise<CompetitionLevelCountry | null>;
  getSport(id: string): Promise<CompetitionLevelSport | null>;
  getOrganization(id: string): Promise<CompetitionLevelOrganization | null>;
  listActiveLevels(query: Required<Pick<CompetitionLevelQuery, 'countryId' | 'sportId' | 'asOf' | 'limit'>> & {
    organizationId: string | null;
  }): Promise<CompetitionLevelOption[]>;
}

type DbCountry = { id: string; is_active: boolean; is_supported: boolean };
type DbSport = { id: string; is_active: boolean };
type DbOrganization = { id: string; is_active: boolean; primary_country_id: string | null };
type DbOrganizationCountry = { country_id: string };
type DbCompetitionLevel = {
  id: string;
  code: string;
  canonical_name: string;
  level_rank: number | null;
  organization_id: string;
  country_id: string;
  valid_from: string | null;
  valid_to: string | null;
};

/** Read-only Supabase adapter. Every lookup is exact-ID and every list is hard-limited. */
export class SupabaseCompetitionLevelDataSource implements CompetitionLevelDataSource {
  constructor(private readonly client: SupabaseClient) {}

  async getCountry(id: string): Promise<CompetitionLevelCountry | null> {
    const { data, error } = await this.client
      .from('countries')
      .select('id,is_active,is_supported')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    const row = data as DbCountry | null;
    return row ? { id: row.id, isActive: row.is_active, isSupported: row.is_supported } : null;
  }

  async getSport(id: string): Promise<CompetitionLevelSport | null> {
    const { data, error } = await this.client.from('sports').select('id,is_active').eq('id', id).maybeSingle();
    if (error) throw error;
    const row = data as DbSport | null;
    return row ? { id: row.id, isActive: row.is_active } : null;
  }

  async getOrganization(id: string): Promise<CompetitionLevelOrganization | null> {
    const [organizationResult, countriesResult] = await Promise.all([
      this.client
        .from('sports_organizations')
        .select('id,is_active,primary_country_id')
        .eq('id', id)
        .maybeSingle(),
      this.client
        .from('sports_organization_countries')
        .select('country_id')
        .eq('organization_id', id)
        .limit(MAX_COMPETITION_LEVEL_LIMIT + 1),
    ]);
    if (organizationResult.error) throw organizationResult.error;
    if (countriesResult.error) throw countriesResult.error;
    const row = organizationResult.data as DbOrganization | null;
    if (!row) return null;
    return {
      id: row.id,
      isActive: row.is_active,
      primaryCountryId: row.primary_country_id,
      countryIds: ((countriesResult.data ?? []) as DbOrganizationCountry[]).map((item) => item.country_id),
    };
  }

  async listActiveLevels(query: Required<Pick<CompetitionLevelQuery, 'countryId' | 'sportId' | 'asOf' | 'limit'>> & {
    organizationId: string | null;
  }): Promise<CompetitionLevelOption[]> {
    let request = this.client
      .from('competition_levels')
      .select('id,code,canonical_name,level_rank,organization_id,country_id,valid_from,valid_to')
      .eq('country_id', query.countryId)
      .eq('sport_id', query.sportId)
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${query.asOf}`)
      .or(`valid_to.is.null,valid_to.gte.${query.asOf}`)
      .order('level_rank', { ascending: true, nullsFirst: false })
      .order('display_order', { ascending: true })
      .order('canonical_name', { ascending: true })
      .limit(query.limit);
    if (query.organizationId) request = request.eq('organization_id', query.organizationId);
    const { data, error } = await request;
    if (error) throw error;
    return ((data ?? []) as DbCompetitionLevel[]).map((row) => ({
      id: row.id,
      code: row.code,
      officialName: row.canonical_name,
      levelRank: row.level_rank,
      organizationId: row.organization_id,
      countryId: row.country_id,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    }));
  }
}

const validDate = (value: string): boolean => {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

/** Internal read-only contract; it exposes no route and performs no persistence. */
export class CountryCompetitionLevelRepository {
  constructor(private readonly source: CompetitionLevelDataSource) {}

  async list(query: CompetitionLevelQuery): Promise<CompetitionLevelQueryResult> {
    const organizationId = query.organizationId?.trim() || null;
    const asOf = query.asOf ?? todayUtc();
    const limit = query.limit ?? DEFAULT_COMPETITION_LEVEL_LIMIT;
    if (
      !UUID_PATTERN.test(query.countryId) ||
      !UUID_PATTERN.test(query.sportId) ||
      (organizationId !== null && !UUID_PATTERN.test(organizationId)) ||
      !validDate(asOf) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_COMPETITION_LEVEL_LIMIT
    ) {
      return { status: 'invalid_query', options: [] };
    }

    const country = await this.source.getCountry(query.countryId);
    if (!country?.isActive || !country.isSupported) return { status: 'unsupported_country', options: [] };

    const sport = await this.source.getSport(query.sportId);
    if (!sport?.isActive) return { status: 'inactive_sport', options: [] };

    if (organizationId) {
      const organization = await this.source.getOrganization(organizationId);
      const belongsToCountry = organization?.primaryCountryId === query.countryId || organization?.countryIds.includes(query.countryId);
      if (!organization?.isActive || !belongsToCountry) {
        return { status: 'organization_not_in_country', options: [] };
      }
    }

    const options = await this.source.listActiveLevels({
      countryId: query.countryId,
      sportId: query.sportId,
      organizationId,
      asOf,
      limit: limit + 1,
    });
    if (options.length > limit) return { status: 'overflow', options: [] };
    return { status: 'ok', options };
  }
}
