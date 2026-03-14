import type { NextRequest } from 'next/server';

import { dbError, invalidPayload, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SearchType = 'all' | 'opportunities' | 'clubs' | 'players' | 'posts' | 'events';

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
  players: SearchResult[];
  posts: SearchResult[];
  events: SearchResult[];
};

type CountsByKind = {
  opportunities: number;
  clubs: number;
  players: number;
  posts: number;
  events: number;
};

type SearchFilters = {
  country: string;
  region: string;
  province: string;
  city: string;
  sport: string;
  category: string;
  role: string;
  q: string;
};

const EMPTY_RESULTS: SearchResultsByKind = {
  opportunities: [],
  clubs: [],
  players: [],
  posts: [],
  events: [],
};

const DEFAULT_LIMIT = 10;
const ALL_PREVIEW_LIMIT = 3;
const SUPPORTED_TYPES: SearchType[] = ['all', 'opportunities', 'clubs', 'players', 'posts', 'events'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function toIlikePattern(value: string) {
  const escaped = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function normalizeType(raw?: string | null): SearchType {
  const cleaned = (raw || '').toLowerCase().trim();
  const aliases: Record<string, SearchType> = {
    all: 'all',
    opportunity: 'opportunities',
    opportunities: 'opportunities',
    club: 'clubs',
    clubs: 'clubs',
    player: 'players',
    players: 'players',
    post: 'posts',
    posts: 'posts',
    event: 'events',
    events: 'events',
  };
  const resolved = aliases[cleaned] ?? cleaned;
  return SUPPORTED_TYPES.includes(resolved as SearchType) ? (resolved as SearchType) : 'all';
}

function emptyCounts(): CountsByKind {
  return { opportunities: 0, clubs: 0, players: 0, posts: 0, events: 0 };
}

function cleanParam(raw: string | null | undefined) {
  return (raw || '').trim();
}

function buildLocationFrom(parts: Array<string | null | undefined>) {
  return parts.map((part) => (typeof part === 'string' ? part.trim() : part)).filter(Boolean).join(' · ');
}

function buildLocation(row: Record<string, any>) {
  return buildLocationFrom([row.city, row.province, row.region, row.country]);
}

function isGeoActive(filters: SearchFilters) {
  return Boolean(filters.country || filters.region || filters.province || filters.city);
}

function isTextActive(filters: SearchFilters) {
  return filters.q.length >= 2;
}

function applyGeoFilters<T>(query: T, filters: SearchFilters) {
  let next = query as any;
  if (filters.country) next = next.ilike('country', filters.country);
  if (filters.region) next = next.ilike('region', filters.region);
  if (filters.province) next = next.ilike('province', filters.province);
  if (filters.city) next = next.ilike('city', filters.city);
  return next as T;
}

function safeClubLabel(values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = (value || '').trim();
    if (!text) continue;
    if (EMAIL_REGEX.test(text)) continue;
    return text;
  }
  return null;
}

async function fetchClubResults(params: { supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>; filters: SearchFilters; limit: number; page: number; }) {
  const { supabase, filters, limit, page } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // clubs_view is schema-volatile across environments; keep only stable columns.
  const geoOrSportActive = isGeoActive(filters) || Boolean(filters.sport);
  let scopedClubIds: string[] | null = null;

  if (geoOrSportActive) {
    let profileIdQuery = supabase.from('profiles').select('id');
    profileIdQuery = applyGeoFilters(profileIdQuery, filters);
    if (filters.sport) profileIdQuery = profileIdQuery.ilike('sport', filters.sport);

    const { data: profileIds, error: profileIdsError } = await profileIdQuery;
    if (profileIdsError) throw new Error(profileIdsError.message);

    scopedClubIds = (profileIds ?? []).map((row) => String(row.id)).filter(Boolean);
    if (scopedClubIds.length === 0) {
      return { count: 0, results: [] as SearchResult[] };
    }
  }

  let query = supabase.from('clubs_view').select('id, display_name', { count: 'exact' });

  if (scopedClubIds) {
    query = query.in('id', scopedClubIds);
  }

  if (isTextActive(filters)) {
    const q = toIlikePattern(filters.q);
    query = query.or(`display_name.ilike.${q}`);
  }

  const { data, count, error } = await query.order('display_name', { ascending: true }).range(from, to);
  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as Array<{ id: string; display_name: string | null }>) : [];
  const clubIds = rows.map((row) => row.id).filter(Boolean);

  let profileMap = new Map<string, {
    avatar_url?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    country?: string | null;
    sport?: string | null;
  }>();

  if (clubIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url, city, province, region, country, sport')
      .in('id', clubIds);

    if (profilesError) throw new Error(profilesError.message);

    profileMap = new Map(
      (profiles ?? []).map((profile) => [String(profile.id), {
        avatar_url: profile.avatar_url ?? null,
        city: profile.city ?? null,
        province: profile.province ?? null,
        region: profile.region ?? null,
        country: profile.country ?? null,
        sport: profile.sport ?? null,
      }]),
    );
  }

  return {
    count: count ?? 0,
    results: rows.map((row) => ({
      id: String(row.id),
      title: row.display_name?.trim() || 'Club',
      subtitle: buildLocationFrom([
        profileMap.get(String(row.id))?.sport,
        buildLocation(profileMap.get(String(row.id)) ?? {}),
      ]) || null,
      image_url: profileMap.get(String(row.id))?.avatar_url ?? null,
      href: `/clubs/${row.id}`,
      kind: 'clubs' as const,
    })),
  };
}


async function fetchPlayerResults(params: { supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>; filters: SearchFilters; limit: number; page: number; }) {
  const { supabase, filters, limit, page } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('athletes_view').select('id, full_name, avatar_url, city, province, region, country, sport, role, status', { count: 'exact' }).eq('status', 'active');
  query = applyGeoFilters(query, filters);
  if (filters.sport) query = query.ilike('sport', filters.sport);
  if (filters.role) query = query.ilike('role', filters.role);

  if (isTextActive(filters)) {
    const q = toIlikePattern(filters.q);
    query = query.or([`full_name.ilike.${q}`, `role.ilike.${q}`, `sport.ilike.${q}`, `city.ilike.${q}`, `province.ilike.${q}`, `region.ilike.${q}`, `country.ilike.${q}`].join(','));
  }

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];

  return {
    count: count ?? 0,
    results: rows.map((row: any) => ({
      id: String(row.id),
      title: row.full_name?.trim() || 'Player',
      subtitle: buildLocationFrom([row.role, row.sport, buildLocation(row)]) || null,
      image_url: row.avatar_url || null,
      href: `/players/${row.id}`,
      kind: 'players' as const,
    })),
  };
}

async function fetchOpportunityResults(params: { supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>; filters: SearchFilters; limit: number; page: number; }) {
  const { supabase, filters, limit, page } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('opportunities').select('id, title, description, city, province, region, country, sport, role, category, required_category, club_id, club_name, created_by, owner_id', { count: 'exact' });
  query = applyGeoFilters(query, filters);
  if (filters.sport) query = query.ilike('sport', filters.sport);
  if (filters.role) query = query.ilike('role', filters.role);
  if (filters.category) query = query.or(`category.ilike.${filters.category},required_category.ilike.${filters.category}`);

  if (isTextActive(filters)) {
    const q = toIlikePattern(filters.q);
    query = query.or([`title.ilike.${q}`, `description.ilike.${q}`, `city.ilike.${q}`, `province.ilike.${q}`, `region.ilike.${q}`, `country.ilike.${q}`, `sport.ilike.${q}`, `role.ilike.${q}`, `category.ilike.${q}`, `required_category.ilike.${q}`, `club_name.ilike.${q}`].join(','));
  }

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];

  const clubIds = Array.from(new Set(rows.flatMap((row: any) => [row.club_id, row.created_by, row.owner_id]).filter(Boolean)));
  const profilesMap = new Map<string, { display_name?: string | null; full_name?: string | null; avatar_url?: string | null }>();
  if (clubIds.length) {
    const [byId, byUser] = await Promise.all([
      supabase.from('profiles').select('id, display_name, full_name, avatar_url').in('id', clubIds),
      supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', clubIds),
    ]);

    [...(byId.data || []), ...(byUser.data || [])].forEach((row: any) => {
      const key = row.id || row.user_id;
      if (key) profilesMap.set(String(key), { display_name: row.display_name ?? null, full_name: row.full_name ?? null, avatar_url: row.avatar_url ?? null });
    });
  }

  return {
    count: count ?? 0,
    results: rows.map((row: any) => {
      const clubKey = row.club_id || row.created_by || row.owner_id;
      const profile = clubKey ? profilesMap.get(String(clubKey)) : null;
      const clubLabel = safeClubLabel([row.club_name, profile?.display_name, profile?.full_name]);
      return {
        id: String(row.id),
        title: row.title?.trim() || 'Opportunità',
        subtitle: buildLocationFrom([clubLabel, buildLocation(row)]) || null,
        image_url: profile?.avatar_url || null,
        href: `/opportunities/${row.id}`,
        kind: 'opportunities' as const,
      };
    }),
  };
}

async function fetchPostResults(params: { supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>; filters: SearchFilters; limit: number; page: number; kind: 'normal' | 'event'; }) {
  const { supabase, filters, limit, page, kind } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (isGeoActive(filters) || !isTextActive(filters)) return { count: 0, results: [] as SearchResult[] };

  const q = toIlikePattern(filters.q);
  let query = supabase.from('posts').select('id, author_id, content, event_payload, created_at', { count: 'exact' }).eq('kind', kind);
  if (kind === 'event') {
    query = query.or([`content.ilike.${q}`, `event_payload->>title.ilike.${q}`, `event_payload->>description.ilike.${q}`, `event_payload->>location.ilike.${q}`].join(','));
  } else {
    query = query.ilike('content', q);
  }

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];

  return {
    count: count ?? 0,
    results: rows.map((row: any) => {
      const payload = row.event_payload || {};
      const isEvent = kind === 'event';
      return {
        id: String(row.id),
        title: isEvent ? payload.title || row.content || 'Evento' : row.content || 'Post',
        subtitle: isEvent ? payload.location || null : null,
        image_url: isEvent ? payload.poster_url || null : null,
        href: `/posts/${row.id}`,
        kind: isEvent ? ('events' as const) : ('posts' as const),
      };
    }),
  };
}

function parseFilters(url: URL): SearchFilters {
  return {
    country: cleanParam(url.searchParams.get('country')),
    region: cleanParam(url.searchParams.get('region')),
    province: cleanParam(url.searchParams.get('province')),
    city: cleanParam(url.searchParams.get('city')),
    sport: cleanParam(url.searchParams.get('sport')),
    category: cleanParam(url.searchParams.get('category')),
    role: cleanParam(url.searchParams.get('role')),
    q: cleanParam(url.searchParams.get('q') ?? url.searchParams.get('query') ?? ''),
  };
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:global', limit: 120, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  const url = new URL(req.url);
  const type = normalizeType(url.searchParams.get('type'));
  const page = clamp(Number(url.searchParams.get('page') || '1'), 1, 1000);
  const limit = clamp(Number(url.searchParams.get('limit') || String(DEFAULT_LIMIT)), 1, 50);
  const filters = parseFilters(url);

  if (!isGeoActive(filters) && !isTextActive(filters)) {
    return invalidPayload('Imposta almeno un filtro geografico oppure una query testuale di almeno 2 caratteri.');
  }

  try {
    const supabase = await getSupabaseServerClient();
    const results: SearchResultsByKind = { ...EMPTY_RESULTS };
    let counts = emptyCounts();

    if (type === 'all') {
      const previewLimit = Math.min(ALL_PREVIEW_LIMIT, limit);
      const [clubs, players, opportunities, posts, events] = await Promise.all([
        fetchClubResults({ supabase, filters, limit: previewLimit, page: 1 }),
        fetchPlayerResults({ supabase, filters, limit: previewLimit, page: 1 }),
        fetchOpportunityResults({ supabase, filters, limit: previewLimit, page: 1 }),
        fetchPostResults({ supabase, filters, limit: previewLimit, page: 1, kind: 'normal' }),
        fetchPostResults({ supabase, filters, limit: previewLimit, page: 1, kind: 'event' }),
      ]);

      results.clubs = clubs.results;
      results.players = players.results;
      results.opportunities = opportunities.results;
      results.posts = posts.results;
      results.events = events.results;
      counts = { clubs: clubs.count, players: players.count, opportunities: opportunities.count, posts: posts.count, events: events.count };
    } else {
      const [clubs, players, opportunities, posts, events] = await Promise.all([
        fetchClubResults({ supabase, filters, limit: type === 'clubs' ? limit : 1, page: type === 'clubs' ? page : 1 }),
        fetchPlayerResults({ supabase, filters, limit: type === 'players' ? limit : 1, page: type === 'players' ? page : 1 }),
        fetchOpportunityResults({ supabase, filters, limit: type === 'opportunities' ? limit : 1, page: type === 'opportunities' ? page : 1 }),
        fetchPostResults({ supabase, filters, limit: type === 'posts' ? limit : 1, page: type === 'posts' ? page : 1, kind: 'normal' }),
        fetchPostResults({ supabase, filters, limit: type === 'events' ? limit : 1, page: type === 'events' ? page : 1, kind: 'event' }),
      ]);

      counts = { clubs: clubs.count, players: players.count, opportunities: opportunities.count, posts: posts.count, events: events.count };
      if (type === 'clubs') results.clubs = clubs.results;
      if (type === 'players') results.players = players.results;
      if (type === 'opportunities') results.opportunities = opportunities.results;
      if (type === 'posts') results.posts = posts.results;
      if (type === 'events') results.events = events.results;
    }

    return successResponse({ type, page, limit, filters, counts, results });
  } catch (error) {
    if (error instanceof Error) return dbError(error.message);
    return unknownError({ endpoint: 'GET /api/search', error });
  }
}
