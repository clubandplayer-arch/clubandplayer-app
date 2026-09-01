import type { NextRequest } from 'next/server';
import { successResponse, unknownError } from '@/lib/api/standardResponses';
import { isProfileEligibleForFollowSuggestions } from '@/lib/profiles/completion';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  applySuggestionGeographyFilter,
  loadViewerSuggestionGeography,
} from '@/lib/search/suggestionGeography.server';

export const runtime = 'nodejs';
const ENDPOINT_VERSION = 'who-to-follow@2026-09-01-d4';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  type?: string | null;
  birth_year?: number | null;
  region?: string | null;
  province?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
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
    const profilesClient = supabase;
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

    const geographyPlan = await loadViewerSuggestionGeography(supabase, profile);

    const { data: existing } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profile.id)
      .limit(500);

    const alreadyFollowing = new Set(
      (existing ?? [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .map((id) => id.toString())
        .filter((id) => UUID_RE.test(id)),
    );
    alreadyFollowing.add(profile.id);
    const exclusionClause = `(${Array.from(alreadyFollowing).map((id) => `"${id}"`).join(',')})`;
    const followRowsTotal = (existing ?? []).length;
    const followRowsActive = followRowsTotal;
    const excludedIdsCount = alreadyFollowing.size;

    const baseSelect =
      'id, full_name, display_name, avatar_url, sport, role, city, country, region, province, account_type, type, status, birth_year, interest_region_id, interest_province_id, interest_municipality_id, updated_at';

    const buildBaseQuery = () => {
      let query = profilesClient
        .from('profiles')
        .select(baseSelect)
        .or('status.eq.active,status.eq.pending,status.is.null');
      if (alreadyFollowing.size) {
        query = query.not('id', 'in', exclusionClause);
      }
      return query;
    };

    const buildCountQuery = () => {
      return profilesClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.active,status.eq.pending,status.is.null');
    };

    async function mapSuggestions(rows: SuggestionRow[]) {
      const athleteIds = rows.filter((row) => isAthlete(row.account_type)).map((row) => row.id);
      const athleteMap = new Map<string, { full_name: string | null; display_name: string | null }>();

      if (athleteIds.length) {
      const { data: athletes } = await profilesClient
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
        .filter((row) => isProfileEligibleForFollowSuggestions(row))
        .map((row) => {
          const athlete = athleteMap.get(row.id);
          const fullName = cleanName(athlete?.full_name ?? row.full_name);
          const displayName = cleanName(athlete?.display_name ?? row.display_name) ?? fullName ?? 'Profilo';
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

    let profilesVisibleTotal: number | null = null;
    let candidatesAfterSelfExclude: number | null = null;
    let candidatesAfterAlreadyFollowedExclude: number | null = null;
    let totalEligibleAfterExclude: number | null = null;
    if (debugMode) {
      const [totalResult, selfExcludedResult, followedExcludedResult] = await Promise.all([
        profilesClient.from('profiles').select('id', { count: 'exact', head: true }),
        buildCountQuery().neq('id', profile.id),
        buildCountQuery().not('id', 'in', exclusionClause),
      ]);
      profilesVisibleTotal = totalResult.error ? null : totalResult.count;
      candidatesAfterSelfExclude = selfExcludedResult.error ? null : selfExcludedResult.count;
      candidatesAfterAlreadyFollowedExclude = followedExcludedResult.error ? null : followedExcludedResult.count;
      totalEligibleAfterExclude = candidatesAfterAlreadyFollowedExclude;
    }

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

    for (const geographyFilter of geographyPlan.filters) {
      if (results.length >= limit) break;
      const { data: rows, error } = await applySuggestionGeographyFilter(buildBaseQuery(), geographyFilter)
        .order('updated_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw error;

      zoneCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    if (results.length < limit && profile.sport) {
      const { data: rows, error } = await buildBaseQuery()
        .eq('sport', profile.sport)
        .order('updated_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw error;

      sportCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    if (results.length < limit) {
      const { data: rows, error } = await buildBaseQuery()
        .order('updated_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw error;

      recentFallbackCandidates += (rows ?? []).length;
      addSuggestions(await mapSuggestions((rows ?? []) as SuggestionRow[]));
    }

    const suggestions = results.slice(0, limit);
    const sampleReturned = suggestions.slice(0, 3).map((item) => ({
      id: item.id,
      type: item.type ?? null,
      name: item.display_name ?? item.full_name ?? 'Profilo',
    }));
    const sampleExcluded = [
      ...(profile?.id ? [{ id: profile.id, reason: 'self' }] : []),
      ...(existing ?? [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .slice(0, 2)
        .map((id) => ({ id, reason: 'already_followed' })),
    ].slice(0, 3);

    return successResponse(
      debugMode
        ? {
            suggestions,
            debug: {
              endpointVersion: ENDPOINT_VERSION,
              adminModeEnabled: false,
              serviceRoleConfigured: false,
              adminQueryError: null,
              meProfileId: profile.id,
              meUserId: user.id,
              totalProfilesInDb: profilesVisibleTotal,
              totalEligibleAfterExclude,
              returnedCount: suggestions.length,
              profilesVisibleTotal,
              followRowsTotal,
              followRowsActive,
              excludedIdsCount,
              candidatesAfterSelfExclude,
              candidatesAfterAlreadyFollowedExclude,
              zoneCandidates,
              geographyFilterCount: geographyPlan.filters.length,
              hasCanonicalGeographyInterests: geographyPlan.hasCanonicalInterests,
              openToRelocation: geographyPlan.openToRelocation,
              sportCandidates,
              fallbackRecentCandidates: recentFallbackCandidates,
              returned: suggestions.length,
              sampleReturned,
              sampleExcluded,
              usedColumns: {
                follows: {
                  follower: 'follower_profile_id',
                  target: 'target_profile_id',
                },
                profiles: 'id',
              },
            },
          }
        : { suggestions },
    );
  } catch (error) {
    return unknownError({ endpoint: 'suggestions/who-to-follow', error });
  }
}
