import { Profile } from '@/types/profile';

export type SearchMapFilters = {
  sport?: string | null;
  clubCategory?: string | null;
  foot?: string | null;
  gender?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
};

export type SearchMapBounds = {
  north?: number | null;
  south?: number | null;
  east?: number | null;
  west?: number | null;
};

export type SearchMapProfile = Partial<Profile> & {
  id: string;
  profile_id?: string | null;
  account_type?: Profile['type'] | null;
  full_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  club_league_category?: string | null;
  foot?: string | null;
  gender?: string | null;
  birth_year?: number | null;
};

export type SearchMapParams = {
  bounds: SearchMapBounds;
  query?: string;
  type?: 'all' | 'club' | 'player' | 'athlete';
  limit?: number;
  filters?: SearchMapFilters;
  currentUserId?: string | null;
};

export type SearchMapResponse = {
  data: SearchMapProfile[];
  total?: number;
  fallback?: string;
};

function appendIfValue(params: URLSearchParams, key: string, value?: string | number | null) {
  if (value === undefined || value === null) return;
  const stringified = typeof value === 'number' ? String(value) : value.trim?.() ?? '';
  if (!stringified) return;
  params.set(key, stringified);
}

export async function searchProfilesOnMap(params: SearchMapParams): Promise<SearchMapResponse> {
  const { bounds, query, type = 'all', limit = 300, filters = {}, currentUserId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(limit));
  searchParams.set('type', type);

  appendIfValue(searchParams, 'north', bounds.north);
  appendIfValue(searchParams, 'south', bounds.south);
  appendIfValue(searchParams, 'east', bounds.east);
  appendIfValue(searchParams, 'west', bounds.west);

  appendIfValue(searchParams, 'sport', filters.sport);
  appendIfValue(searchParams, 'club_category', filters.clubCategory);
  appendIfValue(searchParams, 'foot', filters.foot);
  appendIfValue(searchParams, 'gender', filters.gender);
  appendIfValue(searchParams, 'age_min', filters.ageMin);
  appendIfValue(searchParams, 'age_max', filters.ageMax);

  appendIfValue(searchParams, 'current_user_id', currentUserId ?? undefined);

  const trimmedQuery = query?.trim();
  if (trimmedQuery) searchParams.set('query', trimmedQuery);

  const queryString = searchParams.toString();
  const url = `/api/search/map?${queryString}`;

  console.log('[search-service] requesting', {
    url,
    bounds,
    query: trimmedQuery,
    filters,
    type,
    limit,
  });

  const res = await fetch(url, { cache: 'no-store' });
  const rawText = await res.text();

  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = rawText;
  }

  if (!res.ok) {
    console.error('[search-service] error response', { status: res.status, body: json });
    throw new Error(typeof json?.error === 'string' ? json.error : rawText || `HTTP ${res.status}`);
  }

  const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const payload: SearchMapResponse = {
    data: data as SearchMapProfile[],
    total: typeof json?.total === 'number' ? json.total : undefined,
    fallback: typeof json?.fallback === 'string' ? json.fallback : undefined,
  };

  console.log('[search-service] success', { count: payload.data.length, total: payload.total, fallback: payload.fallback });
  return payload;
}
