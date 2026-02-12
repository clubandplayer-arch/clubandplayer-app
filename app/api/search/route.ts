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
const ATHLETES_SELECT = 'id, full_name, avatar_url, city, province, region, country, sport, role';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function toIlikePattern(value: string) {
  const escaped = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function buildLocationFrom(parts: Array<string | null | undefined>) {
  return parts.map((part) => (typeof part === 'string' ? part.trim() : part)).filter(Boolean).join(' · ');
}

function buildLocation(row: Record<string, any>) {
  return buildLocationFrom([row.city, row.province, row.region, row.country]);
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

function buildProfileQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  table: 'athletes_view' | 'clubs_view',
  ilikeQuery: string,
  select: string,
  options?: { count?: 'exact'; head?: boolean },
) {
  let query = supabase.from(table).select(select, options).eq('status', 'active');

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

  return query;
}

async function fetchProfileResults(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  kind: 'clubs' | 'players';
  ilikeQuery: string;
  limit: number;
  page: number;
}) {
  const { supabase, kind, ilikeQuery, limit, page } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (kind === 'clubs') {
    const { data, count, error } = await supabase
      .from('clubs_view')
      .select('id, display_name', { count: 'exact' })
      .ilike('display_name', ilikeQuery)
      .order('display_name', { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? (data as any[]) : [];
    const clubIds = rows.map((row) => row.id).filter(Boolean);
    let extrasMap = new Map<
      string,
      { avatar_url?: string | null; city?: string | null; province?: string | null; region?: string | null; country?: string | null; sport?: string | null }
    >();

    if (clubIds.length) {
      const { data: extras, error: extrasError } = await supabase
        .from('profiles')
        .select('id, avatar_url, city, province, region, country, sport')
        .in('id', clubIds);
      if (extrasError) throw new Error(extrasError.message);
      extrasMap = new Map(
        (extras ?? []).map((row) => [String(row.id), row as { avatar_url?: string | null; city?: string | null; province?: string | null; region?: string | null; country?: string | null; sport?: string | null }]),
      );
    }

    const results: SearchResult[] = rows.map((row) => {
      const displayName = (row.display_name || '').trim();
      const extras = extrasMap.get(String(row.id));
      const location = buildLocation(extras ?? {});
      const subtitle = [extras?.sport, location].filter(Boolean).join(' · ');
      return {
        id: String(row.id),
        title: displayName || 'Club',
        subtitle: subtitle || null,
        image_url: extras?.avatar_url ?? null,
        href: `/clubs/${row.id}`,
        kind,
      };
    });

    return { results, count: count ?? 0 };
  }

  const table = 'athletes_view';
  const query = buildProfileQuery(supabase, table, ilikeQuery, ATHLETES_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as any[]) : [];

  const results: SearchResult[] = rows.map((row) => {
    const title = (row.full_name || '').trim() || 'Player';
    const details = [row.role, row.sport].filter(Boolean).join(' · ');
    const location = buildLocation(row);
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
  kind: 'clubs' | 'players';
  ilikeQuery: string;
}) {
  const { supabase, kind, ilikeQuery } = params;
  if (kind === 'clubs') {
    const { count, error } = await supabase
      .from('clubs_view')
      .select('id', { count: 'exact', head: true })
      .ilike('display_name', ilikeQuery);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const query = buildProfileQuery(supabase, 'athletes_view', ilikeQuery, 'id', { count: 'exact', head: true });
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function buildOpportunityQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  select: string,
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
  return query;
}

async function fetchOpportunityResults(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  ilikeQuery: string;
  limit: number;
  page: number;
  status?: string | null;
}) {
  const { supabase, ilikeQuery, limit, page, status } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await buildOpportunityQuery(
    supabase,
    ilikeQuery,
    'id, title, description, city, province, region, country, club_id, club_name, created_by, owner_id',
    { count: 'exact' },
    status,
  )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as any[]) : [];
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

    const combined = [
      ...(byProfileId.data || []),
      ...(byUserId.data || []),
    ] as Array<{ id?: string | null; user_id?: string | null; full_name?: string | null; display_name?: string | null; avatar_url?: string | null }>;
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
    const location = buildLocation(row);
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
  status?: string | null;
}) {
  const { supabase, ilikeQuery, status } = params;
  const { count, error } = await buildOpportunityQuery(supabase, ilikeQuery, 'id', {
    count: 'exact',
    head: true,
  }, status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function buildPostsQuery(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ilikeQuery: string,
  kind: 'normal' | 'event',
  select: string,
  options?: { count?: 'exact'; head?: boolean },
) {
  const query = supabase.from('posts').select(select, options).eq('kind', kind);

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
}) {
  const { supabase, ilikeQuery, limit, page, kind } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await buildPostsQuery(
    supabase,
    ilikeQuery,
    kind,
    'id, author_id, content, created_at, kind, event_payload, media_url',
    { count: 'exact' },
  )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? (data as any[]) : [];
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter(Boolean)));

  let authorMap = new Map<string, { name?: string | null; avatar?: string | null }>();

  if (authorIds.length) {
    const [byUserId, byProfileId] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', authorIds),
      supabase.from('profiles').select('id, display_name, full_name, avatar_url').in('id', authorIds),
    ]);

    const combined = [
      ...(byUserId.data || []),
      ...(byProfileId.data || []),
    ] as Array<{ id?: string | null; user_id?: string | null; full_name?: string | null; display_name?: string | null; avatar_url?: string | null }>;
    const nextMap = new Map<string, { name?: string | null; avatar?: string | null }>();
    combined.forEach((row) => {
      const keyCandidates = [row.user_id, row.id].filter(Boolean);
      keyCandidates.forEach((key) => {
        nextMap.set(String(key), { name: row.full_name || row.display_name, avatar: row.avatar_url });
      });
    });

    const unresolvedAuthorIds = authorIds.filter((authorId) => !nextMap.has(String(authorId)));

    if (unresolvedAuthorIds.length) {
      const [clubsFallback, athletesFallback] = await Promise.all([
        supabase.from('clubs_view').select('id, display_name, avatar_url').in('id', unresolvedAuthorIds),
        supabase.from('athletes_view').select('id, full_name, avatar_url').in('id', unresolvedAuthorIds),
      ]);

      const fallbackRows = [
        ...((clubsFallback.data || []) as Array<{ id?: string | null; display_name?: string | null; full_name?: string | null; avatar_url?: string | null }>),
        ...((athletesFallback.data || []) as Array<{ id?: string | null; display_name?: string | null; full_name?: string | null; avatar_url?: string | null }>),
      ];

      fallbackRows.forEach((row) => {
        if (!row.id) return;
        const key = String(row.id);
        const existing = nextMap.get(key);
        const name = existing?.name || row.full_name || row.display_name || null;
        const avatar = existing?.avatar || row.avatar_url || null;
        if (name || avatar) {
          nextMap.set(key, { name, avatar });
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
    const subtitle =
      isEvent
        ? [eventPayload?.location, author?.name].filter(Boolean).join(' · ')
        : author?.name || null;

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
}) {
  const { supabase, ilikeQuery, kind } = params;
  const { count, error } = await buildPostsQuery(supabase, ilikeQuery, kind, 'id', {
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

  if (query.length < 2) {
    return invalidPayload('La query deve contenere almeno 2 caratteri.');
  }

  const ilikeQuery = toIlikePattern(query);

  try {
    const supabase = await getSupabaseServerClient();
    const results: SearchResultsByKind = { ...EMPTY_RESULTS };
    let counts: CountsByKind = emptyCounts();

    if (type === 'all') {
      const previewLimit = Math.min(ALL_PREVIEW_LIMIT, limit);

      const [clubs, players, opportunities, posts, events] = await Promise.all([
        fetchProfileResults({ supabase, kind: 'clubs', ilikeQuery, limit: previewLimit, page: 1 }),
        fetchProfileResults({ supabase, kind: 'players', ilikeQuery, limit: previewLimit, page: 1 }),
        fetchOpportunityResults({ supabase, ilikeQuery, limit: previewLimit, page: 1, status }),
        fetchPosts({ supabase, ilikeQuery, limit: previewLimit, page: 1, kind: 'normal' }),
        fetchPosts({ supabase, ilikeQuery, limit: previewLimit, page: 1, kind: 'event' }),
      ]);

      results.clubs = clubs.results;
      results.players = players.results;
      results.opportunities = opportunities.results;
      results.posts = posts.results;
      results.events = events.results;

      counts = {
        clubs: clubs.count,
        players: players.count,
        opportunities: opportunities.count,
        posts: posts.count,
        events: events.count,
      };
    } else {
      const countPromises = Promise.all([
        fetchProfileCount({ supabase, kind: 'clubs', ilikeQuery }),
        fetchProfileCount({ supabase, kind: 'players', ilikeQuery }),
        fetchOpportunityCount({ supabase, ilikeQuery, status }),
        fetchPostsCount({ supabase, ilikeQuery, kind: 'normal' }),
        fetchPostsCount({ supabase, ilikeQuery, kind: 'event' }),
      ]);

      const resultsPromise = (() => {
        switch (type) {
          case 'clubs':
            return fetchProfileResults({ supabase, kind: 'clubs', ilikeQuery, limit, page }).then((payload) => {
              results.clubs = payload.results;
              return payload;
            });
          case 'players':
            return fetchProfileResults({ supabase, kind: 'players', ilikeQuery, limit, page }).then((payload) => {
              results.players = payload.results;
              return payload;
            });
          case 'opportunities':
            return fetchOpportunityResults({ supabase, ilikeQuery, limit, page, status }).then((payload) => {
              results.opportunities = payload.results;
              return payload;
            });
          case 'posts':
            return fetchPosts({ supabase, ilikeQuery, limit, page, kind: 'normal' }).then((payload) => {
              results.posts = payload.results;
              return payload;
            });
          case 'events':
            return fetchPosts({ supabase, ilikeQuery, limit, page, kind: 'event' }).then((payload) => {
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
        players: countsResult[1],
        opportunities: countsResult[2],
        posts: countsResult[3],
        events: countsResult[4],
      };

      if (activePayload?.count != null) {
        switch (type) {
          case 'clubs':
            counts.clubs = activePayload.count;
            break;
          case 'players':
            counts.players = activePayload.count;
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
      counts,
      results,
    });
  } catch (error) {
    if (error instanceof Error) {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'GET /api/search', error });
  }
}
