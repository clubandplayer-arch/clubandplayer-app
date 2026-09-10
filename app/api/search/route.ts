import type { NextRequest } from 'next/server';

import { dbError, invalidPayload, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { rateLimit } from '@/lib/api/rateLimit';
import { getCountryName } from '@/lib/geo/countries';
import { normalizeSport } from '@/lib/opps/constants';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations.server';
import { attachOpportunityGeography, opportunityGeographyLabel } from '@/lib/opportunities/geography';
import {
  canonicalAreaLegacyField,
  parseSearchGeography,
  resolveCanonicalSearchGeography,
  SearchGeographyContractError,
  type CanonicalSearchGeographyScope,
  type ParsedSearchGeography,
} from '@/lib/search/canonicalGeographyContract';
import { SupabaseSearchGeographyCatalog } from '@/lib/search/canonicalGeography.server';
import { applyCanonicalSportFilters, CanonicalSportFilterError, parseCanonicalSportFilters, type CanonicalSportFilters } from '@/lib/search/canonicalSportFilters';

export const runtime = 'nodejs';

type SearchType = 'all' | 'opportunities' | 'clubs' | 'institutions' | 'players' | 'staff' | 'posts' | 'events';

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  href: string;
  kind: Exclude<SearchType, 'all'>;
};

type SearchResultsByKind = {
  opportunities: SearchResult[];
  clubs: SearchResult[];
  institutions: SearchResult[];
  players: SearchResult[];
  staff: SearchResult[];
  posts: SearchResult[];
  events: SearchResult[];
};

type CountsByKind = {
  opportunities: number;
  clubs: number;
  institutions: number;
  players: number;
  staff: number;
  posts: number;
  events: number;
};

type SearchFilters = {
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  sport: string | null;
  role: string | null;
  canonicalSport: CanonicalSportFilters | null;
  canonical: CanonicalSearchGeographyScope | null;
};

const EMPTY_RESULTS: SearchResultsByKind = {
  opportunities: [],
  clubs: [],
  institutions: [],
  players: [],
  staff: [],
  posts: [],
  events: [],
};

const DEFAULT_LIMIT = 10;
const ALL_PREVIEW_LIMIT = 3;

const SUPPORTED_TYPES: SearchType[] = ['all', 'opportunities', 'clubs', 'institutions', 'players', 'staff', 'posts', 'events'];
const ATHLETES_SELECT = 'id, full_name, avatar_url, city, province, region, country, sport, role';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function toIlikePattern(value: string) {
  const escaped = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function toIlikeExact(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function buildLocationFrom(parts: Array<string | null | undefined>) {
  return parts.map((part) => (typeof part === 'string' ? part.trim() : part)).filter(Boolean).join(' · ');
}

function buildLocation(row: Record<string, any>, provinceAbbreviations: Record<string, string>) {
  return buildLocationFrom([row.city, provinceDisplayValue(row.province, provinceAbbreviations), row.region, row.country]);
}

function normalizeType(raw?: string | null): SearchType {
  const cleaned = (raw || '').toLowerCase().trim();
  const aliases: Record<string, SearchType> = {
    all: 'all',
    opportunity: 'opportunities',
    opportunities: 'opportunities',
    club: 'clubs',
    clubs: 'clubs',
    institution: 'institutions',
    institutions: 'institutions',
    ente: 'institutions',
    enti: 'institutions',
    player: 'players',
    players: 'players',
    staff: 'staff',
    post: 'posts',
    posts: 'posts',
    event: 'events',
    events: 'events',
  };
  const resolved = aliases[cleaned] ?? cleaned;
  return SUPPORTED_TYPES.includes(resolved as SearchType) ? (resolved as SearchType) : 'all';
}

function emptyCounts(): CountsByKind {
  return { opportunities: 0, clubs: 0, institutions: 0, players: 0, staff: 0, posts: 0, events: 0 };
}

function normalizeTextFilter(raw?: string | null) {
  const value = raw?.trim();
  return value ? value : null;
}

function readFilters(url: URL, parsedGeography: ParsedSearchGeography): SearchFilters {
  const countryRaw = parsedGeography.mode === 'canonical_unvalidated'
    ? null
    : parsedGeography.legacy.country;
  const countryCode = countryRaw?.toUpperCase() ?? null;
  return {
    country: countryCode,
    region: parsedGeography.mode === 'canonical_unvalidated' ? null : parsedGeography.legacy.region,
    province: parsedGeography.mode === 'canonical_unvalidated' ? null : parsedGeography.legacy.province,
    city: parsedGeography.mode === 'canonical_unvalidated' ? null : parsedGeography.legacy.city,
    sport: normalizeSport(url.searchParams.get('sport')),
    role: normalizeTextFilter(url.searchParams.get('role')),
    canonicalSport: parseCanonicalSportFilters(url.searchParams),
    canonical: null,
  };
}

function applyCanonicalProfileFilters(query: any, scope: CanonicalSearchGeographyScope) {
  const countryValues = Array.from(new Set([
    scope.countryIso2,
    scope.countryName,
    getCountryName(scope.countryIso2),
  ].filter((value): value is string => Boolean(value?.trim()))));
  let nextQuery = query.or(
    countryValues.map((value) => `country.ilike.${toIlikeExact(value)}`).join(','),
  );
  if (scope.geoAreaName && scope.geoAreaType) {
    nextQuery = nextQuery.ilike(canonicalAreaLegacyField(scope.geoAreaType), scope.geoAreaName);
  }
  return nextQuery;
}

function applyCommonFilters<T>(query: T, filters: SearchFilters, options?: { allowRegion?: boolean; allowProvince?: boolean; allowSport?: boolean; allowRole?: boolean; canonicalLocation?: 'profile' | 'opportunity'; canonicalSportColumns?: boolean }) {
  let nextQuery: any = query;

  if (filters.canonical && options?.canonicalLocation === 'opportunity') {
    nextQuery = nextQuery.eq('country_id', filters.canonical.countryId);
    if (filters.canonical.geoAreaName && filters.canonical.geoAreaType) {
      nextQuery = nextQuery.ilike(
        canonicalAreaLegacyField(filters.canonical.geoAreaType),
        filters.canonical.geoAreaName,
      );
    }
  } else if (filters.canonical) {
    nextQuery = applyCanonicalProfileFilters(nextQuery, filters.canonical);
  } else if (filters.country) {
    const countryLabel = getCountryName(filters.country);
    if (countryLabel) nextQuery = nextQuery.or(`country.eq.${filters.country},country.ilike.${toIlikePattern(countryLabel)}`);
    else nextQuery = nextQuery.eq('country', filters.country);
  }
  if (options?.allowRegion && filters.region) nextQuery = nextQuery.ilike('region', toIlikePattern(filters.region));
  if (options?.allowProvince && filters.province) nextQuery = nextQuery.ilike('province', toIlikePattern(filters.province));
  if (filters.city) nextQuery = nextQuery.ilike('city', toIlikePattern(filters.city));
  if (options?.canonicalSportColumns && filters.canonicalSport) nextQuery = applyCanonicalSportFilters(nextQuery, filters.canonicalSport, filters.sport);
  else if (options?.allowSport && filters.sport) nextQuery = nextQuery.ilike('sport', toIlikePattern(filters.sport));
  if (options?.allowRole && filters.role) nextQuery = nextQuery.ilike('role', toIlikePattern(filters.role));

  return nextQuery as T;
}

function buildProfileQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  table: 'athletes_view' | 'clubs_view',
  ilikeQuery: string,
  select: string,
  filters: SearchFilters,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = applyPublicProfileVisibilityFilters(supabase.from(table).select(select, options)).not('full_name', 'is', null).neq('full_name', '').not('role', 'is', null).neq('role', '');

  const commonOr = [
    `city.ilike.${ilikeQuery}`,
    `province.ilike.${ilikeQuery}`,
    `region.ilike.${ilikeQuery}`,
    `country.ilike.${ilikeQuery}`,
    `sport.ilike.${ilikeQuery}`,
  ];
  const athleteOr = [`full_name.ilike.${ilikeQuery}`, ...commonOr, `role.ilike.${ilikeQuery}`];
  const clubOr = [`display_name.ilike.${ilikeQuery}`, ...commonOr];

  query = query.or((table === 'athletes_view' ? athleteOr : clubOr).join(','));
  query = applyCommonFilters(query, filters, { allowRegion: table === 'athletes_view', allowProvince: table === 'athletes_view', allowSport: table === 'athletes_view', allowRole: table === 'athletes_view' });

  return query;
}


function buildClubQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  select: string,
  filters: SearchFilters,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = applyPublicProfileVisibilityFilters(
    supabase.from('profiles').select(select, options),
  )
    .or('account_type.eq.club,type.eq.club')
    .or('display_name.not.is.null,full_name.not.is.null');

  query = query.or(
    [
      `display_name.ilike.${ilikeQuery}`,
      `full_name.ilike.${ilikeQuery}`,
      `city.ilike.${ilikeQuery}`,
      `province.ilike.${ilikeQuery}`,
      `region.ilike.${ilikeQuery}`,
      `country.ilike.${ilikeQuery}`,
      `sport.ilike.${ilikeQuery}`,
    ].join(','),
  );

  query = applyCommonFilters(query, filters, { allowRegion: true, allowProvince: true, allowSport: true, allowRole: false, canonicalSportColumns: true });

  return query;
}


function buildInstitutionQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  select: string,
  filters: SearchFilters,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = applyPublicProfileVisibilityFilters(
    supabase
      .from('profiles')
      .select(select, options)
      .or('account_type.eq.institution,type.eq.institution'),
  );

  query = query.or(
    [
      `display_name.ilike.${ilikeQuery}`,
      `full_name.ilike.${ilikeQuery}`,
      `headline.ilike.${ilikeQuery}`,
      `role.ilike.${ilikeQuery}`,
      `city.ilike.${ilikeQuery}`,
      `province.ilike.${ilikeQuery}`,
      `region.ilike.${ilikeQuery}`,
      `country.ilike.${ilikeQuery}`,
      `club_motto.ilike.${ilikeQuery}`,
      `bio.ilike.${ilikeQuery}`,
      `club_stadium.ilike.${ilikeQuery}`,
      `club_stadium_address.ilike.${ilikeQuery}`,
    ].join(','),
  );

  query = applyCommonFilters(query, filters, { allowRegion: true, allowProvince: true, allowSport: false, allowRole: false });

  return query;
}

function buildStaffQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  select: string,
  filters: SearchFilters,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = applyPublicProfileVisibilityFilters(
    supabase.from('profiles').select(select, options),
  )
    .or('account_type.eq.staff,type.eq.staff')
    .or(
      [
        `display_name.ilike.${ilikeQuery}`,
        `full_name.ilike.${ilikeQuery}`,
        `city.ilike.${ilikeQuery}`,
        `province.ilike.${ilikeQuery}`,
        `region.ilike.${ilikeQuery}`,
        `country.ilike.${ilikeQuery}`,
        `sport.ilike.${ilikeQuery}`,
        `role.ilike.${ilikeQuery}`,
      ].join(','),
    );

  // Publication already represents the canonical profile-completeness check.
  // Requiring optional fields here (notably display_name and bio) used to hide
  // otherwise published staff profiles from name searches.
  query = applyCommonFilters(query, filters, {
    allowRegion: true,
    allowProvince: true,
    allowSport: true,
    allowRole: true,
    canonicalSportColumns: true,
  });

  return query;
}

async function fetchProfileResults(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  kind: 'clubs' | 'institutions' | 'players' | 'staff';
  ilikeQuery: string;
  limit: number;
  page: number;
  filters: SearchFilters;
}) {
  const { supabase, kind, ilikeQuery, limit, page, filters } = params;
  const provinceAbbreviations = await getProvinceAbbreviationsServer();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (kind === 'clubs') {
    const { data, count, error } = await buildClubQuery(
      supabase,
      ilikeQuery,
      'id, full_name, display_name, avatar_url, city, province, region, country, sport',
      filters,
      { count: 'exact' },
    )
      .order('display_name', { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? (data as any[]) : [];

    const results: SearchResult[] = rows.map((row) => {
      const displayName = (row.display_name || row.full_name || '').trim();
      const location = buildLocation(row, provinceAbbreviations);
      const subtitle = [row.sport, location].filter(Boolean).join(' · ');
      return {
        id: String(row.id),
        title: displayName || 'Club',
        subtitle: subtitle || null,
        image_url: row.avatar_url || null,
        href: `/clubs/${row.id}`,
        kind,
      };
    });

    return { results, count: count ?? 0 };
  }

  if (kind === 'institutions') {
    if (filters.sport || filters.role) return { results: [], count: 0 };
    const { data, count, error } = await buildInstitutionQuery(
      supabase,
      ilikeQuery,
      'id, full_name, display_name, avatar_url, city, province, region, country, headline, role, club_motto, bio, club_stadium, club_stadium_address',
      filters,
      { count: 'exact' },
    )
      .order('display_name', { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? (data as any[]) : [];

    const results: SearchResult[] = rows.map((row) => {
      const displayName = (row.display_name || row.full_name || '').trim();
      const location = buildLocation(row, provinceAbbreviations);
      const institutionDetails = row.headline || row.role || row.club_motto || row.bio || row.club_stadium || row.club_stadium_address;
      const subtitle = [institutionDetails, location].filter(Boolean).join(' · ');
      return {
        id: String(row.id),
        title: displayName || 'Ente',
        subtitle: subtitle || null,
        image_url: row.avatar_url || null,
        href: `/institutions/${row.id}`,
        kind,
      };
    });

    return { results, count: count ?? 0 };
  }

  if (kind === 'staff') {
    const { data, count, error } = await buildStaffQuery(
      supabase,
      ilikeQuery,
      'id, full_name, display_name, avatar_url, city, province, region, country, sport, role, account_type, type',
      filters,
      { count: 'exact' },
    )
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? (data as any[]) : [];
    const results: SearchResult[] = rows.map((row) => {
      const title = (row.full_name || row.display_name || '').trim() || 'Staff';
      const details = [row.role, row.sport].filter(Boolean).join(' · ');
      const location = buildLocation(row, provinceAbbreviations);
      const subtitle = [details, location].filter(Boolean).join(' · ');
      return {
        id: String(row.id),
        title,
        subtitle: subtitle || null,
        image_url: row.avatar_url || null,
        href: `/players/${row.id}`,
        kind: 'staff',
      };
    });
    return { results, count: count ?? 0 };
  }

  let query = (kind === 'players'
    ? buildProfileQuery(supabase, 'athletes_view', ilikeQuery, ATHLETES_SELECT, filters, { count: 'exact' }).not('role', 'ilike', 'staff')
    : buildProfileQuery(supabase, 'athletes_view', ilikeQuery, ATHLETES_SELECT, filters, { count: 'exact' }).ilike('role', 'staff'))
    .order('created_at', { ascending: false })
    .range(from, to);

  if (kind === 'players' && filters.canonicalSport) {
    let idsQuery = applyPublicProfileVisibilityFilters(supabase.from('profiles').select('id'))
      .or('account_type.eq.athlete,type.eq.athlete,account_type.eq.player,type.eq.player');
    idsQuery = applyCanonicalSportFilters(idsQuery, filters.canonicalSport, filters.sport);
    const { data: canonicalProfiles, error: canonicalError } = await idsQuery;
    if (canonicalError) throw new Error(canonicalError.message);
    const ids = (canonicalProfiles ?? []).map((row) => row.id).filter(Boolean);
    if (!ids.length) return { results: [], count: 0 };
    query = query.in('id', ids);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as any[]) : [];

  const results: SearchResult[] = rows.map((row) => {
    const title = (row.full_name || '').trim() || 'Player';
    const details = [row.role, row.sport].filter(Boolean).join(' · ');
    const location = buildLocation(row, provinceAbbreviations);
    const subtitle = [details, location].filter(Boolean).join(' · ');
    return {
      id: String(row.id),
      title,
      subtitle: subtitle || null,
      image_url: row.avatar_url || null,
      href: `/players/${row.id}`,
      kind,
    };
  });

  return { results, count: count ?? 0 };
}

async function fetchProfileCount(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  kind: 'clubs' | 'institutions' | 'players' | 'staff';
  ilikeQuery: string;
  filters: SearchFilters;
}) {
  const { supabase, kind, ilikeQuery, filters } = params;
  if (kind === 'clubs') {
    const query = buildClubQuery(supabase, ilikeQuery, 'id', filters, { count: 'exact', head: true });
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  if (kind === 'institutions') {
    if (filters.sport || filters.role) return 0;
    const query = buildInstitutionQuery(supabase, ilikeQuery, 'id', filters, { count: 'exact', head: true });
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  if (kind === 'staff') {
    const { count, error } = await buildStaffQuery(
      supabase,
      ilikeQuery,
      'id',
      filters,
      { count: 'exact', head: true },
    );
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  let query = kind === 'players'
    ? buildProfileQuery(supabase, 'athletes_view', ilikeQuery, 'id', filters, { count: 'exact', head: true }).not('role', 'ilike', 'staff')
    : buildProfileQuery(supabase, 'athletes_view', ilikeQuery, 'id', filters, { count: 'exact', head: true }).ilike('role', 'staff');
  if (kind === 'players' && filters.canonicalSport) {
    let idsQuery = applyPublicProfileVisibilityFilters(supabase.from('profiles').select('id'))
      .or('account_type.eq.athlete,type.eq.athlete,account_type.eq.player,type.eq.player');
    idsQuery = applyCanonicalSportFilters(idsQuery, filters.canonicalSport, filters.sport);
    const { data: canonicalProfiles, error: canonicalError } = await idsQuery;
    if (canonicalError) throw new Error(canonicalError.message);
    const ids = (canonicalProfiles ?? []).map((row) => row.id).filter(Boolean);
    if (!ids.length) return 0;
    query = query.in('id', ids);
  }
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function buildOpportunityQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  select: string,
  filters: SearchFilters,
  options?: { count?: 'exact'; head?: boolean },
  status?: string | null,
) {
  let query = supabase
    .from('opportunities')
    .select(select, options)
    .or(
      [
        `title.ilike.${ilikeQuery}`,
        `description.ilike.${ilikeQuery}`,
        `city.ilike.${ilikeQuery}`,
        `province.ilike.${ilikeQuery}`,
        `region.ilike.${ilikeQuery}`,
        `country.ilike.${ilikeQuery}`,
        `sport.ilike.${ilikeQuery}`,
        `role.ilike.${ilikeQuery}`,
      ].join(','),
    );
  if (status) {
    query = query.eq('status', status);
  }
  query = applyCommonFilters(query, filters, { allowRegion: true, allowProvince: true, allowSport: true, allowRole: true, canonicalLocation: 'opportunity', canonicalSportColumns: true });
  return query;
}

async function fetchOpportunityResults(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  ilikeQuery: string;
  limit: number;
  page: number;
  filters: SearchFilters;
  status?: string | null;
}) {
  const { supabase, ilikeQuery, limit, page, filters, status } = params;
  const provinceAbbreviations = await getProvinceAbbreviationsServer();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await buildOpportunityQuery(
    supabase,
    ilikeQuery,
    'id, title, description, city, province, region, country, country_id, geo_area_id, club_id, club_name, created_by, owner_id',
    filters,
    { count: 'exact' },
    status,
  )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rawRows = Array.isArray(data) ? (data as any[]) : [];
  const rows = await attachOpportunityGeography(supabase, rawRows);
  const clubIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.club_id, row.created_by, row.owner_id])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let clubProfileMap = new Map<string, { name?: string | null; avatar?: string | null }>();

  if (clubIds.length) {
    const [byProfileId, byUserId] = await Promise.all([
      supabase.from('profiles').select('id, display_name, full_name, avatar_url').in('id', clubIds),
      supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', clubIds),
    ]);

    const combined = [...(byProfileId.data || []), ...(byUserId.data || [])] as Array<{
      id?: string | null;
      user_id?: string | null;
      full_name?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    }>;
    const nextMap = new Map<string, { name?: string | null; avatar?: string | null }>();
    combined.forEach((row) => {
      const key = row.id ?? row.user_id;
      if (key) {
        nextMap.set(String(key), { name: row.full_name || row.display_name, avatar: row.avatar_url });
      }
    });
    clubProfileMap = nextMap;
  }

  const results: SearchResult[] = rows.map((row) => {
    const clubId = row.club_id || row.created_by || row.owner_id || '';
    const clubProfile = clubProfileMap.get(String(clubId));
    const title = row.title?.trim() || 'Opportunità';
    const location = opportunityGeographyLabel(row.geography) ?? buildLocation(row, provinceAbbreviations);
    const subtitle = [row.club_name || clubProfile?.name, location].filter(Boolean).join(' · ');

    return {
      id: String(row.id),
      title,
      subtitle: subtitle || null,
      image_url: clubProfile?.avatar || null,
      href: `/opportunities/${row.id}`,
      kind: 'opportunities',
    };
  });

  return { results, count: count ?? 0 };
}

async function fetchOpportunityCount(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  ilikeQuery: string;
  filters: SearchFilters;
  status?: string | null;
}) {
  const { supabase, ilikeQuery, filters, status } = params;
  const { count, error } = await buildOpportunityQuery(
    supabase,
    ilikeQuery,
    'id',
    filters,
    { count: 'exact', head: true },
    status,
  );
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function hasProfileFilters(filters: SearchFilters) {
  return Boolean(filters.canonical || filters.canonicalSport || filters.country || filters.region || filters.province || filters.city || filters.sport || filters.role);
}

async function fetchFilteredAuthorIds(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  filters: SearchFilters;
}) {
  const { supabase, filters } = params;

  if (!hasProfileFilters(filters)) {
    return null;
  }

  let query = applyPublicProfileVisibilityFilters(
    supabase.from('profiles').select('id, user_id'),
  );

  query = applyCommonFilters(query, filters, { allowRegion: true, allowProvince: true, allowSport: true, allowRole: true, canonicalSportColumns: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .flatMap((row) => [row.id, row.user_id])
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function buildPostsQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  kind: 'normal' | 'event',
  select: string,
  authorIds: string[] | null,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = supabase.from('posts').select(select, options).eq('kind', kind);

  if (authorIds && authorIds.length > 0) {
    query = query.in('author_id', authorIds);
  }

  if (kind === 'event') {
    return query.or(
      [
        `content.ilike.${ilikeQuery}`,
        `event_payload->>title.ilike.${ilikeQuery}`,
        `event_payload->>description.ilike.${ilikeQuery}`,
        `event_payload->>location.ilike.${ilikeQuery}`,
      ].join(','),
    );
  }

  return query.ilike('content', ilikeQuery);
}

async function fetchPosts(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  ilikeQuery: string;
  limit: number;
  page: number;
  kind: 'normal' | 'event';
  filters: SearchFilters;
}) {
  const { supabase, ilikeQuery, limit, page, kind, filters } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const authorIds = await fetchFilteredAuthorIds({ supabase, filters });
  if (authorIds && authorIds.length === 0) {
    return { results: [], count: 0 };
  }

  const { data, count, error } = await buildPostsQuery(
    supabase,
    ilikeQuery,
    kind,
    'id, author_id, content, created_at, kind, event_payload, media_url',
    authorIds,
    { count: 'exact' },
  )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as any[]) : [];
  const rowAuthorIds = Array.from(new Set(rows.map((row) => row.author_id).filter(Boolean)));

  let authorMap = new Map<string, { name?: string | null; avatar?: string | null }>();

  if (rowAuthorIds.length) {
    const toAuthorPayload = (row: {
      full_name?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    }) => {
      const name = row.full_name || row.display_name || null;
      const avatar = row.avatar_url || null;
      return { name, avatar };
    };

    const isGhostProfile = (row: {
      full_name?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
    }) => !row.full_name && !row.display_name && !row.avatar_url;

    const nextMap = new Map<string, { name?: string | null; avatar?: string | null }>();

    const { data: byUserId } = await supabase
      .from('profiles')
      .select('user_id, display_name, full_name, avatar_url')
      .in('user_id', rowAuthorIds);

    (byUserId || [])
      .filter((row) => row?.user_id)
      .filter((row) => !isGhostProfile(row))
      .forEach((row) => {
        nextMap.set(String(row.user_id), toAuthorPayload(row));
      });

    const unresolvedAuthorIds = rowAuthorIds.filter((authorId) => !nextMap.has(String(authorId)));

    if (unresolvedAuthorIds.length) {
      const { data: byProfileId } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, avatar_url')
        .in('id', unresolvedAuthorIds);

      (byProfileId || [])
        .filter((row) => row?.id)
        .filter((row) => !isGhostProfile(row))
        .forEach((row) => {
          const key = String(row.id);
          if (!nextMap.has(key)) {
            nextMap.set(key, toAuthorPayload(row));
          }
        });
    }

    authorMap = nextMap;
  }

  const results: SearchResult[] = rows.map((row) => {
    const author = row.author_id ? authorMap.get(String(row.author_id)) : null;
    const content = (row.content || '').trim();
    const eventPayload = row.event_payload as
      | { title?: string | null; description?: string | null; location?: string | null; poster_url?: string | null }
      | null
      | undefined;

    const isEvent = kind === 'event';
    const title = isEvent ? eventPayload?.title?.trim() || content || 'Evento' : content || 'Post';
    const subtitle = isEvent ? [eventPayload?.location, author?.name].filter(Boolean).join(' · ') : author?.name || null;

    return {
      id: String(row.id),
      title,
      subtitle: subtitle || null,
      image_url: eventPayload?.poster_url || author?.avatar || null,
      href: `/posts/${row.id}`,
      kind: isEvent ? 'events' : 'posts',
    };
  });

  return { results, count: count ?? 0 };
}

async function fetchPostsCount(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  ilikeQuery: string;
  kind: 'normal' | 'event';
  filters: SearchFilters;
}) {
  const { supabase, ilikeQuery, kind, filters } = params;
  const authorIds = await fetchFilteredAuthorIds({ supabase, filters });
  if (authorIds && authorIds.length === 0) {
    return 0;
  }

  const { count, error } = await buildPostsQuery(supabase, ilikeQuery, kind, 'id', authorIds, {
    count: 'exact',
    head: true,
  });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:global', limit: 120, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('keywords') ?? '';
  const query = raw.trim();
  const type = normalizeType(url.searchParams.get('type'));
  const page = clamp(Number(url.searchParams.get('page') || '1'), 1, 1000);
  const limit = clamp(Number(url.searchParams.get('limit') || String(DEFAULT_LIMIT)), 1, 50);
  const rawStatus = (url.searchParams.get('status') || '').trim().toLowerCase();
  const allowedStatuses = new Set(['open', 'closed', 'archived', 'draft']);
  const status = rawStatus && allowedStatuses.has(rawStatus) ? rawStatus : null;
  let parsedGeography: ParsedSearchGeography;
  try {
    parsedGeography = parseSearchGeography(url.searchParams);
  } catch (error) {
    if (error instanceof SearchGeographyContractError) return invalidPayload(error.message);
    return invalidPayload('Parametri geografici non validi.');
  }
  let filters: SearchFilters;
  try {
    filters = readFilters(url, parsedGeography);
  } catch (error) {
    if (error instanceof CanonicalSportFilterError) return invalidPayload(error.code);
    return invalidPayload('Parametri sportivi non validi.');
  }

  const hasFilters = Boolean(
    filters.canonicalSport || filters.country || filters.region || filters.province
      || filters.city || filters.sport || filters.role
      || parsedGeography.mode === 'canonical_unvalidated',
  );
  if (query.length === 1 || (!query && !hasFilters)) {
    return invalidPayload('La query deve contenere almeno 2 caratteri.');
  }

  const ilikeQuery = toIlikePattern(query);

  try {
    const supabase = await getSupabaseServerClient();
    if (parsedGeography.mode === 'canonical_unvalidated') {
      filters.canonical = await resolveCanonicalSearchGeography(
        parsedGeography,
        new SupabaseSearchGeographyCatalog(supabase),
        { expandDescendants: false },
      );
    }
    const results: SearchResultsByKind = { ...EMPTY_RESULTS };
    let counts: CountsByKind = emptyCounts();

    if (type === 'all') {
      const previewLimit = Math.min(ALL_PREVIEW_LIMIT, limit);

      const [clubs, institutions, players, staff, opportunities, posts, events] = await Promise.all([
        fetchProfileResults({ supabase, kind: 'clubs', ilikeQuery, limit: previewLimit, page: 1, filters }),
        fetchProfileResults({ supabase, kind: 'institutions', ilikeQuery, limit: previewLimit, page: 1, filters }),
        fetchProfileResults({ supabase, kind: 'players', ilikeQuery, limit: previewLimit, page: 1, filters }),
        fetchProfileResults({ supabase, kind: 'staff', ilikeQuery, limit: previewLimit, page: 1, filters }),
        fetchOpportunityResults({ supabase, ilikeQuery, limit: previewLimit, page: 1, filters, status }),
        fetchPosts({ supabase, ilikeQuery, limit: previewLimit, page: 1, kind: 'normal', filters }),
        fetchPosts({ supabase, ilikeQuery, limit: previewLimit, page: 1, kind: 'event', filters }),
      ]);

      results.clubs = clubs.results;
      results.institutions = institutions.results;
      results.players = players.results;
      results.staff = staff.results;
      results.opportunities = opportunities.results;
      results.posts = posts.results;
      results.events = events.results;

      counts = {
        clubs: clubs.count,
        institutions: institutions.count,
        players: players.count,
        staff: staff.count,
        opportunities: opportunities.count,
        posts: posts.count,
        events: events.count,
      };
    } else {
      const countPromises = Promise.all([
        fetchProfileCount({ supabase, kind: 'clubs', ilikeQuery, filters }),
        fetchProfileCount({ supabase, kind: 'institutions', ilikeQuery, filters }),
        fetchProfileCount({ supabase, kind: 'players', ilikeQuery, filters }),
        fetchProfileCount({ supabase, kind: 'staff', ilikeQuery, filters }),
        fetchOpportunityCount({ supabase, ilikeQuery, filters, status }),
        fetchPostsCount({ supabase, ilikeQuery, kind: 'normal', filters }),
        fetchPostsCount({ supabase, ilikeQuery, kind: 'event', filters }),
      ]);

      const resultsPromise = (() => {
        switch (type) {
          case 'clubs':
            return fetchProfileResults({ supabase, kind: 'clubs', ilikeQuery, limit, page, filters }).then((payload) => {
              results.clubs = payload.results;
              return payload;
            });
          case 'institutions':
            return fetchProfileResults({ supabase, kind: 'institutions', ilikeQuery, limit, page, filters }).then((payload) => {
              results.institutions = payload.results;
              return payload;
            });
          case 'players':
            return fetchProfileResults({ supabase, kind: 'players', ilikeQuery, limit, page, filters }).then((payload) => {
              results.players = payload.results;
              return payload;
            });
          case 'staff':
            return fetchProfileResults({ supabase, kind: 'staff', ilikeQuery, limit, page, filters }).then((payload) => {
              results.staff = payload.results;
              return payload;
            });
          case 'opportunities':
            return fetchOpportunityResults({ supabase, ilikeQuery, limit, page, filters, status }).then((payload) => {
              results.opportunities = payload.results;
              return payload;
            });
          case 'posts':
            return fetchPosts({ supabase, ilikeQuery, limit, page, kind: 'normal', filters }).then((payload) => {
              results.posts = payload.results;
              return payload;
            });
          case 'events':
            return fetchPosts({ supabase, ilikeQuery, limit, page, kind: 'event', filters }).then((payload) => {
              results.events = payload.results;
              return payload;
            });
          default:
            return Promise.resolve({ results: [], count: 0 });
        }
      })();

      const [countsResult, activePayload] = await Promise.all([countPromises, resultsPromise]);
      counts = {
        clubs: countsResult[0],
        institutions: countsResult[1],
        players: countsResult[2],
        staff: countsResult[3],
        opportunities: countsResult[4],
        posts: countsResult[5],
        events: countsResult[6],
      };

      if (activePayload?.count != null) {
        switch (type) {
          case 'clubs':
            counts.clubs = activePayload.count;
            break;
          case 'institutions':
            counts.institutions = activePayload.count;
            break;
          case 'players':
            counts.players = activePayload.count;
            break;
          case 'staff':
            counts.staff = activePayload.count;
            break;
          case 'opportunities':
            counts.opportunities = activePayload.count;
            break;
          case 'posts':
            counts.posts = activePayload.count;
            break;
          case 'events':
            counts.events = activePayload.count;
            break;
          default:
            break;
        }
      }
    }

    return successResponse({
      query,
      type,
      page,
      limit,
      filters: {
        country: filters.country,
        region: filters.region,
        province: filters.province,
        city: filters.city,
        sport: filters.sport,
        role: filters.role,
        sportId: filters.canonicalSport?.sportId ?? null,
        disciplineId: filters.canonicalSport?.disciplineId ?? null,
        variantId: filters.canonicalSport?.variantId ?? null,
        countryId: filters.canonical?.countryId ?? null,
        geoAreaId: filters.canonical?.geoAreaId ?? null,
      },
      counts,
      results,
    });
  } catch (error) {
    if (error instanceof SearchGeographyContractError) return invalidPayload(error.message);
    if (error instanceof Error) {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'GET /api/search', error });
  }
}
