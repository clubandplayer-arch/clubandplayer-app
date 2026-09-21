// app/api/follows/suggestions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { successResponse, validationError } from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { resolveAuthContext } from '@/lib/api/auth';
import { FollowSuggestionsQuerySchema, type FollowSuggestionsQueryInput } from '@/lib/validation/follow';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';
import { isProfileEligibleForPublicDiscovery } from '@/lib/profiles/completion';
import { getCountryName } from '@/lib/geo/countries';
import { SupabaseSearchGeographyCatalog } from '@/lib/search/canonicalGeography.server';
import {
  canonicalAreaLegacyField,
  parseSearchGeography,
  resolveCanonicalSearchGeography,
  SearchGeographyContractError,
  type CanonicalSearchGeographyScope,
} from '@/lib/search/canonicalGeographyContract';
import { rankSuggestionCandidates } from '@/lib/search/suggestionGeography';
import { loadViewerSuggestionGeography } from '@/lib/search/suggestionGeography.server';
import { applyExactCanonicalSportFilters } from '@/lib/search/canonicalSportFilters';

export const runtime = 'nodejs';
const ENDPOINT_VERSION = 'follows-suggestions@2026-09-21-d9';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toIlikeExact = (value: string) => value.replace(/[%_]/g, (token) => `\\${token}`);

async function loadApprovedInstitutionIds(): Promise<string[]> {
  const admin = getSupabaseAdminClientOrNull();
  // Verification requests are intentionally hidden from ordinary users by RLS.
  // Without the service client, fail closed instead of exposing unverified entities.
  if (!admin) return [];

  const { data, error } = await admin
    .from('institution_verification_requests')
    .select('institution_id')
    .eq('status', 'approved')
    .not('reviewer_id', 'is', null)
    .gt('verified_until', new Date().toISOString());
  if (error) throw error;

  return Array.from(new Set(
    (data ?? [])
      .map((row) => String(row.institution_id ?? ''))
      .filter((id) => UUID_RE.test(id)),
  ));
}

async function loadOrganizationIdsForCanonicalScope(
  scope: CanonicalSearchGeographyScope,
): Promise<string[]> {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) throw new Error('canonical organization discovery requires the server database client');

  const { data: preferences, error: preferencesError } = await admin
    .from('profile_preferences')
    .select('profile_id,residence_country_id,residence_geo_area_id')
    .not('residence_country_id', 'is', null);
  if (preferencesError) throw preferencesError;

  const canonicalProfileIds = new Set((preferences ?? []).map((row) => String(row.profile_id)));
  const canonicalMatches = (preferences ?? [])
    .filter((row) => row.residence_country_id === scope.countryId
      && (!scope.geoAreaId || scope.areaIds.includes(String(row.residence_geo_area_id))))
    .map((row) => String(row.profile_id));
  // Organizations are indexed by headquarters. Nationality and scouting
  // interests must never make a Club/Institution appear in another country.
  const countryValues = Array.from(new Set([
    scope.countryIso2,
    scope.countryName,
    getCountryName(scope.countryIso2),
  ].filter((value): value is string => Boolean(value?.trim()))));
  let legacyResidenceQuery = admin.from('profiles').select('id')
    .or('account_type.eq.club,account_type.eq.institution,type.eq.club,type.eq.institution')
    .or(countryValues.map((value) => `country.ilike.${toIlikeExact(value)}`).join(','));
  if (scope.geoAreaName && scope.geoAreaType) {
    const legacyField = canonicalAreaLegacyField(scope.geoAreaType);
    legacyResidenceQuery = legacyResidenceQuery.ilike(legacyField, scope.geoAreaName);
  }
  const legacyResidenceResult = await legacyResidenceQuery;
  if (legacyResidenceResult.error) throw legacyResidenceResult.error;
  const legacyResidenceMatches = (legacyResidenceResult.data ?? [])
    .map((row) => String(row.id))
    .filter((id) => !canonicalProfileIds.has(id));

  return Array.from(new Set([...canonicalMatches, ...legacyResidenceMatches]));
}

async function loadPeopleIdsForInterestScope(scope: CanonicalSearchGeographyScope): Promise<string[]> {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) throw new Error('canonical people discovery requires the server database client');

  const [countryInterestsResult, areaInterestsResult] = await Promise.all([
    admin.from('profile_country_interests').select('profile_id').eq('country_id', scope.countryId),
    admin.from('profile_geo_area_interests')
      .select('profile_id,geo_area_id,area:geo_areas!inner(country_id)')
      .eq('area.country_id', scope.countryId),
  ]);
  if (countryInterestsResult.error) throw countryInterestsResult.error;
  if (areaInterestsResult.error) throw areaInterestsResult.error;

  const canonicalCountryMatches = scope.geoAreaId
    ? []
    : (countryInterestsResult.data ?? []).map((row) => String(row.profile_id));
  const scopedAreaIds = new Set(scope.areaIds);
  const canonicalAreaMatches = (areaInterestsResult.data ?? [])
    .filter((row: any) => scope.geoAreaId
      ? scopedAreaIds.has(String(row.geo_area_id))
      : (Array.isArray(row.area) ? row.area[0] : row.area)?.country_id === scope.countryId)
    .map((row) => String(row.profile_id));

  const countryValues = Array.from(new Set([
    scope.countryIso2, scope.countryName, getCountryName(scope.countryIso2),
  ].filter((value): value is string => Boolean(value?.trim()))));
  let legacyQuery = admin.from('profiles').select('id')
    .or('account_type.eq.athlete,account_type.eq.staff,type.eq.athlete,type.eq.player,type.eq.staff')
    .or(countryValues.map((value) => `interest_country.ilike.${toIlikeExact(value)}`).join(','));
  if (scope.geoAreaName && scope.geoAreaType) {
    legacyQuery = legacyQuery.ilike(`interest_${canonicalAreaLegacyField(scope.geoAreaType)}`, scope.geoAreaName);
  }
  const { data: legacyRows, error: legacyError } = await legacyQuery;
  if (legacyError) throw legacyError;

  return Array.from(new Set([
    ...canonicalCountryMatches,
    ...canonicalAreaMatches,
    ...(legacyRows ?? []).map((row) => String(row.id)),
  ]));
}

type Suggestion = {
  id: string;
  user_id?: string | null;
  name: string;
  kind: 'institution' | 'club' | 'player' | 'staff';
  location?: string | null;
  category?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  profileId?: string;
  resolvedName?: string;
  nameSource?: 'full_name' | 'display_name' | 'fallback';
  resolvedAvatarSource?: 'avatar_url' | 'fallback';
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  followers?: number | null;
  account_type?: string | null;
  is_verified?: boolean | null;
  fan_vote_count?: number | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = FollowSuggestionsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }
  const {
    limit,
    kind,
    sportScope = 'mine',
  }: FollowSuggestionsQueryInput = parsed.data;
  const debugMode = url.searchParams.get('debug') === '1';
  let step = 'init';
  const debugInfo = {
    meProfileId: null as string | null,
    excludedIdsCount: 0,
    excludedIdsSample: [] as string[],
    invalidIdsSample: [] as string[],
    inClause: null as string | null,
  };

  function errorResponse(params: {
    code: string;
    message: string;
    status?: number;
    error?: unknown;
  }) {
    const { code, message, status = 500, error } = params;
    if (debugMode && error) {
      console.error('[follows/suggestions] debug error', {
        message: error instanceof Error ? error.message : (error as any)?.message ?? null,
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        code: (error as any)?.code ?? null,
      });
    }
    const details = debugMode
      ? {
          endpointVersion: ENDPOINT_VERSION,
          step,
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : (error as any)?.message ?? null,
          errorCode: (error as any)?.code ?? null,
          errorHint: (error as any)?.hint ?? null,
          errorDetails: (error as any)?.details ?? null,
          ...debugInfo,
        }
      : undefined;
    const errorDebug = debugMode
      ? {
          message: error instanceof Error ? error.message : (error as any)?.message ?? null,
          details: (error as any)?.details ?? null,
          hint: (error as any)?.hint ?? null,
          code: (error as any)?.code ?? null,
        }
      : undefined;
    return NextResponse.json(
      { ok: false, code, message, ...(details ? { details } : {}), ...(errorDebug ? { error: errorDebug } : {}) },
      { status },
    );
  }

  try {
    step = 'auth';
    let explicitGeography: CanonicalSearchGeographyScope | null = null;
    let explicitOrganizationIds: string[] | null = null;
    let explicitPeopleIds: string[] | null = null;
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return errorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Devi accedere per vedere i suggerimenti.',
        status: 401,
      });
    }
    const { supabase, user } = auth;

    step = 'meProfile';
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, status, country, city, province, region, interest_country, interest_city, interest_province, interest_region, sport, sport_id, sport_discipline_id, sport_variant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const role =
      (profile?.account_type === 'athlete' || profile?.account_type === 'club' || profile?.account_type === 'staff'
        ? profile.account_type
        : 'guest') || 'guest';

    if (!profile?.id || profile.status !== 'active') {
      return successResponse({ items: [], role });
    }

    step = 'scoutingGeography';
    try {
      const geographyRequest = parseSearchGeography(url.searchParams);
      if (geographyRequest.mode === 'canonical_unvalidated') {
        explicitGeography = await resolveCanonicalSearchGeography(
          geographyRequest,
          new SupabaseSearchGeographyCatalog(supabase),
          { expandDescendants: true },
        );
        [explicitOrganizationIds, explicitPeopleIds] = await Promise.all([
          loadOrganizationIdsForCanonicalScope(explicitGeography),
          loadPeopleIdsForInterestScope(explicitGeography),
        ]);
      }
    } catch (error) {
      if (error instanceof SearchGeographyContractError) {
        return validationError(error.message, { code: error.code });
      }
      throw error;
    }

    const profileId = profile.id;
    const viewerSport = profile.sport;
    const viewerSportId = profile.sport_id;
    debugInfo.meProfileId = profileId;

    step = 'viewerGeography';
    const geographyPlan = await loadViewerSuggestionGeography(supabase, profile);

    step = 'follows';
    const { data: existing, error: followsError } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profileId)
      .limit(200);
    if (followsError) throw followsError;

    const excludedIdsRaw = (existing || [])
      .map((row) => (row as any)?.target_profile_id)
      .filter((id) => id !== null && id !== undefined)
      .map((id) => (typeof id === 'string' ? id : String(id)));
    const excludedUuid = excludedIdsRaw.filter((id) => UUID_RE.test(id));
    const invalidIds = excludedIdsRaw.filter((id) => !UUID_RE.test(id));
    debugInfo.excludedIdsCount = excludedIdsRaw.length;
    debugInfo.excludedIdsSample = excludedIdsRaw.slice(0, 5);
    debugInfo.invalidIdsSample = invalidIds.slice(0, 5);

    // "Chi seguire" proposes only profiles that the viewer does not follow yet.
    const alreadyFollowing = new Set(excludedUuid);
    alreadyFollowing.add(profileId);

    const baseSelect =
      'id, user_id, account_type, type, full_name, display_name, role, city, province, region, country, interest_city, interest_province, interest_region, interest_country, interest_region_id, interest_province_id, interest_municipality_id, sport, sport_id, sport_discipline_id, sport_variant_id, birth_year, bio, avatar_url, status, updated_at';

    const normalizeAccountType = (value?: string | null) => {
      const cleaned = typeof value === 'string' ? value.toLowerCase().trim() : '';
      if (!cleaned) return null;
      if (cleaned === 'institution' || cleaned === 'ente') return 'institution';
      if (cleaned === 'club') return 'club';
      if (cleaned === 'athlete' || cleaned === 'player') return 'athlete';
      if (cleaned === 'staff') return 'staff';
      return null;
    };

    // ✅ FIX: quota gli UUID nell’inClause per evitare parse error (HTTP 500)
    const applyExclusions = (query: any) => {
      if (!alreadyFollowing.size) return query;

      const values = Array.from(alreadyFollowing)
        .filter((id) => UUID_RE.test(id))
        .map((id) => `"${id}"`)
        .join(',');

      if (!values) return query;

      const inClause = `(${values})`;
      debugInfo.inClause = inClause;
      return query.not('id', 'in', inClause);
    };

    async function runQuery(accountType: 'institution' | 'club' | 'athlete' | 'staff', filters: Array<(q: any) => any>, max: number) {
      let query = supabase
        .from('profiles')
        .select(baseSelect);

      if (accountType === 'staff') {
        query = query.or('account_type.eq.staff,type.eq.staff');
      } else {
        query = query.eq('account_type', accountType);
      }

      if (accountType === 'institution') {
        const approvedInstitutionIds = await loadApprovedInstitutionIds();
        query = query.in(
          'id',
          approvedInstitutionIds.length
            ? approvedInstitutionIds
            : ['00000000-0000-0000-0000-000000000000'],
        );
      }

      query = applyPublicProfileVisibilityFilters(query)
        .neq('id', profile?.id ?? '');

      filters.forEach((fn) => {
        query = fn(query);
      });

      query = applyExclusions(query);

      query = accountType === 'institution'
        ? query.order('full_name', { ascending: true, nullsFirst: false }).order('display_name', { ascending: true, nullsFirst: false }).limit(max)
        : query.order('updated_at', { ascending: false }).limit(max);

      const { data, error } = await query;
      if (error) throw error;
      return rankSuggestionCandidates(
        (data || []).filter((row) => isProfileEligibleForPublicDiscovery(row)),
        geographyPlan,
        viewerSport,
      );
    }

    const buildLocation = (row: any) => [row.city, row.province, row.region, row.country].filter(Boolean).join(', ');

    const mapSuggestion = (row: any, athleteOverride?: any): Suggestion => {
      const normalizedType = normalizeAccountType(row.account_type ?? row.type);
      const kind = normalizedType === 'institution' ? 'institution' : normalizedType === 'club' ? 'club' : normalizedType === 'staff' ? 'staff' : 'player';
      const fullName = athleteOverride?.full_name ?? row.full_name ?? null;
      const displayName = athleteOverride?.display_name ?? row.display_name ?? null;
      const avatarUrl = athleteOverride?.avatar_url ?? row.avatar_url ?? null;
      const name =
        kind === 'institution'
          ? buildClubDisplayName(fullName, displayName, 'Ente')
          : kind === 'club'
          ? buildClubDisplayName(fullName, displayName, 'Club')
          : buildPlayerDisplayName(fullName, displayName, 'Profilo');

      const resolvedNameSource = fullName ? 'full_name' : displayName ? 'display_name' : 'fallback';
      const resolvedAvatarSource = avatarUrl ? 'avatar_url' : 'fallback';

      return {
        id: row.id,
        user_id: row.user_id ?? null,
        name,
        kind,
        location: buildLocation(row) || null,
        category: row.sport || null,
        city: row.city || null,
        country: row.country || null,
        role: row.role || null,
        sport: row.sport || null,
        avatar_url: avatarUrl || null,
        followers: null,
        account_type: row.account_type || null,
        full_name: fullName,
        display_name: displayName,
        ...(debugMode
          ? {
              profileId: row.id,
              resolvedName: name,
              nameSource: resolvedNameSource,
              resolvedAvatarSource,
            }
          : {}),
      };
    };

    const results: any[] = [];
    const seen = new Set<string>();

    const addSuggestions = (rows: any[], maxToAdd?: number) => {
      let added = 0;
      for (const row of rows) {
        if (!row?.id) continue;
        const id = String(row.id);
        if (seen.has(id)) continue;
        seen.add(id);
        results.push(row);
        added += 1;
        if (results.length >= limit || (maxToAdd && added >= maxToAdd)) break;
      }
      return added;
    };

    step = 'candidates';
    const escapeLike = (value: string) => value.replace(/[%_]/g, (token) => `\\${token}`);

    const buildFilters = (forOrganizations = false) => {
      const filters: Array<Array<(q: any) => any>> = [];
      const sportFilter: Array<(q: any) => any> = [];

      if (sportScope === 'mine' && viewerSportId) {
        sportFilter.push((q) =>
          applyExactCanonicalSportFilters(
            q,
            {
              sportId: viewerSportId,
              disciplineId: profile.sport_discipline_id,
              variantId: profile.sport_variant_id,
            },
            profile.sport,
          ),
        );
      } else if (sportScope === 'mine' && profile.sport) {
        const value = `%${escapeLike(profile.sport.trim())}%`;
        sportFilter.push((q) => q.ilike('sport', value));
      }

      if (explicitGeography) {
        const matchingIds = forOrganizations ? explicitOrganizationIds : explicitPeopleIds;
        const ids = matchingIds?.length
          ? matchingIds
          : ['00000000-0000-0000-0000-000000000000'];
        filters.push([(query) => query.in('id', ids), ...sportFilter]);
        return filters;
      }

      // An empty country means every country. Personalized geography is used by
      // rankSuggestionCandidates for ordering only; it must never fill the
      // result window with a local bucket before foreign profiles are considered.
      filters.push([...sportFilter]);
      return filters;
    };

    const clubFilters = buildFilters(true);
    const playerFilters = buildFilters();

    if (kind === 'institution' || kind === 'club' || kind === 'player' || kind === 'staff') {
      const accountType = kind === 'institution' ? 'institution' : kind === 'club' ? 'club' : kind === 'staff' ? 'staff' : 'athlete';
      const filters = kind === 'institution' || kind === 'club' ? clubFilters : playerFilters;
      for (const filterGroup of filters) {
        if (results.length >= limit) break;
        const rows = await runQuery(accountType, filterGroup, limit * 6);
        addSuggestions(rows);
      }
    } else {
      const clubSlotsTarget = Math.min(2, limit);
      const playerSlotsTarget = Math.max(0, Math.min(2, limit - clubSlotsTarget));

      for (const filters of clubFilters) {
        if (results.length >= clubSlotsTarget) break;
        const rows = await runQuery('club', filters, limit * 4);
        addSuggestions(rows, clubSlotsTarget - results.length);
      }

      let addedPlayers = 0;
      for (const filters of playerFilters) {
        if (addedPlayers >= playerSlotsTarget || results.length >= limit) break;
        const rows = await runQuery('athlete', filters, limit * 4);
        addedPlayers += addSuggestions(rows, playerSlotsTarget - addedPlayers);
      }

      if (results.length < limit) {
        for (const filters of clubFilters) {
          if (results.length >= limit) break;
          const rows = await runQuery('club', filters, limit * 6);
          addSuggestions(rows);
        }
      }

      if (results.length < limit) {
        for (const filters of playerFilters) {
          if (results.length >= limit) break;
          const rows = await runQuery('athlete', filters, limit * 6);
          addSuggestions(rows);
        }
      }
    }

    const rawResults = results.slice(0, limit);
    const athleteIds = rawResults
      .filter((row) => normalizeAccountType(row?.account_type ?? row?.type) === 'athlete')
      .map((row) => row.id)
      .filter(Boolean);
    let fanVoteCountMap = new Map<string, number>();
    if (athleteIds.length) {
      const { data: voteRows, error: voteError } = await supabase
        .from('current_player_fan_vote_counts')
        .select('player_profile_id, vote_count')
        .in('player_profile_id', athleteIds);
      if (voteError) throw voteError;
      fanVoteCountMap = new Map((voteRows || []).map((row: any) => [String(row.player_profile_id), Number(row.vote_count ?? 0)]));
    }

    let athleteMap = new Map<string, { full_name?: string | null; display_name?: string | null; avatar_url?: string | null }>();
    if (athleteIds.length) {
      const { data: athletes, error: athletesError } = await supabase
        .from('athletes_view')
        .select('id, full_name, display_name, avatar_url')
        .in('id', athleteIds);
      if (athletesError) throw athletesError;
      const nextMap = new Map<string, { full_name?: string | null; display_name?: string | null; avatar_url?: string | null }>();
      (athletes ?? []).forEach((row: any) => {
        if (row?.id) {
          nextMap.set(String(row.id), {
            full_name: row.full_name ?? null,
            display_name: row.display_name ?? null,
            avatar_url: row.avatar_url ?? null,
          });
        }
      });
      athleteMap = nextMap;
    }

    const clubIds = rawResults
      .filter((row) => normalizeAccountType(row?.account_type ?? row?.type) === 'club')
      .map((row) => row.id)
      .filter(Boolean);

    let clubVerificationMap = new Map<string, boolean>();
    if (clubIds.length) {
      try {
        const adminClient = getSupabaseAdminClientOrNull();
        const verificationClient = adminClient ?? supabase;
        const { data: verificationRows, error: verificationError } = await verificationClient
          .from('club_verification_requests')
          .select('club_id, status, payment_status, verified_until, created_at')
          .in('club_id', clubIds)
          .eq('status', 'approved')
          .in('payment_status', ['paid', 'waived'])
          .gt('verified_until', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (verificationError) throw verificationError;
        const nextMap = new Map<string, boolean>();
        (verificationRows ?? []).forEach((row: any) => {
          if (!row?.club_id || nextMap.has(String(row.club_id))) return;
          nextMap.set(String(row.club_id), true);
        });
        clubVerificationMap = nextMap;
      } catch (error) {
        console.error('[follows/suggestions] club verification lookup failed', {
          message: error instanceof Error ? error.message : (error as any)?.message ?? null,
          details: (error as any)?.details ?? null,
          hint: (error as any)?.hint ?? null,
          code: (error as any)?.code ?? null,
        });
      }
    }

    const items = rawResults.map((row) => {
      const normalizedRowType = normalizeAccountType(row?.account_type ?? row?.type);
      const isClub = normalizedRowType === 'club';
      return {
        ...mapSuggestion(row, athleteMap.get(String(row.id))),
        is_verified: isClub ? clubVerificationMap.get(String(row.id)) ?? false : null,
        fan_vote_count: normalizedRowType === 'athlete' ? fanVoteCountMap.get(String(row.id)) ?? 0 : 0,
      };
    });

    return successResponse({
      items,
      nextCursor: null,
      role,
      ...(debugMode
        ? {
            debug: {
              endpointVersion: ENDPOINT_VERSION,
              step,
              geographyFilterCount: geographyPlan.filters.length,
              hasCanonicalGeographyInterests: geographyPlan.hasCanonicalInterests,
              openToRelocation: geographyPlan.openToRelocation,
              rankingVersion: 'd5-v1',
              scoutingCountryId: explicitGeography?.countryId ?? null,
              scoutingGeoAreaId: explicitGeography?.geoAreaId ?? null,
            },
          }
        : {}),
    });
  } catch (err) {
    const error = err as any;
    console.error('[follows/suggestions] error', { step, error });
    const message = typeof error?.message === 'string' ? error.message : 'Errore server';
    const code = (() => {
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('rls')) {
        return 'RLS_DENIED';
      }
      if (message.toLowerCase().includes('column') && message.toLowerCase().includes('does not exist')) {
        return 'SCHEMA_MISMATCH';
      }
      if (typeof error?.code === 'string' && error.code === '42501') {
        return 'RLS_DENIED';
      }
      return 'DB_ERROR';
    })();
    return errorResponse({
      code,
      message: code === 'SCHEMA_MISMATCH' ? 'Schema non allineato per i suggerimenti.' : 'Errore server.',
      status: 500,
      error,
    });
  }
}
