import type { NextRequest } from 'next/server';
import { successResponse, unknownError } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SuggestionRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  country: string | null;
  account_type: string | null;
};

type Suggestion = {
  id: string;
  type: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  country: string | null;
};

const emailRegex = /\S+@\S+\.\S+/;

function cleanName(value?: string | null) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return null;
  if (emailRegex.test(trimmed)) return null;
  return trimmed;
}

function isAthlete(accountType: string | null | undefined) {
  return typeof accountType === 'string' && accountType.toLowerCase().includes('athlete');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 5, 10));
  const debugMode = url.searchParams.get('debug') === '1';

  try {
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      return successResponse({ suggestions: [] as Suggestion[] });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, status, account_type, sport, country, region, province, city, interest_country, interest_region, interest_province, interest_city',
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.id || profile.status !== 'active') {
      return successResponse({ suggestions: [] as Suggestion[] });
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profile.id)
      .limit(500);

    const alreadyFollowing = new Set(
      (existing ?? [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .map((id) => id.toString()),
    );
    alreadyFollowing.add(profile.id);
    const followRowsAny = (existing ?? []).length;
    const followRowsActive = followRowsAny;
    const excludedByFollowAny = followRowsAny;
    const excludedByFollowActive = followRowsActive;
    const sampleExcluded = [
      ...(profile?.id ? [{ id: profile.id, reason: 'self' }] : []),
      ...(existing ?? [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .slice(0, 2)
        .map((id) => ({ id, reason: 'already_followed' })),
    ].slice(0, 3);

    const baseSelect =
      'id, full_name, display_name, avatar_url, sport, role, city, country, account_type, status, updated_at';

    const buildBaseQuery = () => {
      let query = supabase
        .from('profiles')
        .select(baseSelect)
        .or('status.eq.active,status.eq.pending,status.is.null');
      if (alreadyFollowing.size) {
        const values = Array.from(alreadyFollowing)
          .map((id) => `'${id}'`)
          .join(',');
        query = query.not('id', 'in', `(${values})`);
      }
      return query;
    };

    const buildCountQuery = () => {
      return supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.active,status.eq.pending,status.is.null');
    };

    async function mapSuggestions(rows: SuggestionRow[]) {
      const athleteIds = rows.filter((row) => isAthlete(row.account_type)).map((row) => row.id);
      const athleteMap = new Map<string, { full_name: string | null; display_name: string | null }>();

      if (athleteIds.length) {
        const { data: athletes } = await supabase
          .from('athletes_view')
          .select('id, full_name, display_name')
          .in('id', athleteIds);

        for (const athlete of athletes ?? []) {
          if (athlete.id) {
            athleteMap.set(athlete.id as string, {
              full_name: (athlete as any).full_name ?? null,
              display_name: (athlete as any).display_name ?? null,
            });
          }
        }
      }

      return rows
        .map((row) => {
          const athlete = athleteMap.get(row.id);
          const fullName = cleanName(athlete?.full_name ?? row.full_name);
          const displayName = cleanName(athlete?.display_name ?? row.display_name);
          if (!fullName && !displayName) return null;
          return {
            id: row.id,
            type: row.account_type ?? null,
            display_name: displayName ?? null,
            full_name: fullName ?? null,
            avatar_url: row.avatar_url ?? null,
            sport: row.sport ?? null,
            role: row.role ?? null,
            city: row.city ?? null,
            country: row.country ?? null,
          } satisfies Suggestion;
        })
        .filter(Boolean) as Suggestion[];
    }

    const results: Suggestion[] = [];
    const seen = new Set<string>();
    let zoneCandidates = 0;
    let sportCandidates = 0;
    let recentFallbackCandidates = 0;

    const candidatesTotal = (await buildCountQuery()).count ?? 0;
    const candidatesAfterSelfExclude = profile.id
      ? ((await buildCountQuery().neq('id', profile.id)).count ?? 0)
      : candidatesTotal;
    const candidatesAfterAlreadyFollowedExclude = alreadyFollowing.size
      ? ((await buildCountQuery().not('id', 'in', `(${Array.from(alreadyFollowing).map((id) => `'${id}'`).join(',')})`))
          .count ?? 0)
      : candidatesAfterSelfExclude;

    const addSuggestions = (items: Suggestion[]) => {
      let added = 0;
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        results.push(item);
        added += 1;
        if (results.length >= limit) break;
      }
      return added;
    };

    const locationFilters = [
      { field: 'city', value: profile.interest_city || profile.city },
      { field: 'province', value: profile.interest_province || profile.province },
      { field: 'region', value: profile.interest_region || profile.region },
      { field: 'country', value: profile.interest_country || profile.country },
    ].filter((item) => typeof item.value === 'string' && item.value.trim().length > 0);

    for (const loc of locationFilters) {
      if (results.length >= limit) break;
      const { data: rows } = await buildBaseQuery()
        .eq(loc.field, (loc.value as string).trim())
        .order('updated_at', { ascending: false })
        .limit(limit * 3);

      zoneCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    if (results.length < limit && profile.sport) {
      const { data: rows } = await buildBaseQuery()
        .eq('sport', profile.sport)
        .order('updated_at', { ascending: false })
        .limit(limit * 3);

      sportCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    if (results.length < limit) {
      const { data: rows } = await buildBaseQuery()
        .order('updated_at', { ascending: false })
        .limit(limit * 3);

      recentFallbackCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    const suggestions = results.slice(0, limit);
    const sampleReturned = suggestions.slice(0, 3).map((item) => ({
      id: item.id,
      type: item.type ?? null,
      name: item.display_name ?? item.full_name ?? 'Profilo',
    }));

    return successResponse(
      debugMode
        ? {
            suggestions,
            debug: {
              meProfileId: profile.id,
              meUserId: user.id,
              followRowsAny,
              followRowsActive,
              excludedByFollowActive,
              excludedByFollowAny,
              candidatesTotal,
              candidatesAfterSelfExclude,
              candidatesAfterAlreadyFollowedExclude,
              zoneCandidates,
              sportCandidates,
              fallbackRecentCandidates: recentFallbackCandidates,
              returned: suggestions.length,
              sampleReturned,
              sampleExcluded,
            },
          }
        : { suggestions },
    );
  } catch (error) {
    return unknownError({ endpoint: 'suggestions/who-to-follow', error });
  }
}
