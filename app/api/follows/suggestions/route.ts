// app/api/follows/suggestions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, validationError } from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FollowSuggestionsQuerySchema, type FollowSuggestionsQueryInput } from '@/lib/validation/follow';
import { buildClubDisplayName, buildPlayerDisplayName } from '@/lib/displayName';

export const runtime = 'nodejs';
const ENDPOINT_VERSION = 'follows-suggestions@2026-01-10a';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Suggestion = {
  id: string;
  name: string;
  kind: 'club' | 'player';
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
};

function getSupabaseServiceRoleClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = FollowSuggestionsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }
  const { limit, kind }: FollowSuggestionsQueryInput = parsed.data;
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
    return NextResponse.json(
      { ok: false, code, message, ...(details ? { details } : {}) },
      { status },
    );
  }

  try {
    step = 'auth';
    const supabase = await getSupabaseServerClient();
    const serviceRoleClient = getSupabaseServiceRoleClient();
    const { data: userRes, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[follows/suggestions] auth error', authError);
      return errorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Devi accedere per vedere i suggerimenti.',
        status: 401,
        error: authError,
      });
    }

    if (!userRes?.user) {
      return errorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Devi accedere per vedere i suggerimenti.',
        status: 401,
      });
    }

    step = 'meProfile';
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, status, country, city, province, region, interest_country, interest_city, interest_province, interest_region, sport')
      .eq('user_id', userRes.user.id)
      .maybeSingle();

    const role =
      (profile?.account_type === 'athlete' || profile?.account_type === 'club'
        ? profile.account_type
        : 'guest') || 'guest';

    if (!profile?.id || profile.status !== 'active') {
      return successResponse({ items: [], role });
    }

    const profileId = profile.id;
    debugInfo.meProfileId = profileId;

    const viewerCountry = (profile?.interest_country || profile?.country || '').trim();
    const viewerCity = (profile?.interest_city || profile?.city || '').trim();
    const viewerProvince = (profile?.interest_province || profile?.province || '').trim();
    const viewerRegion = (profile?.interest_region || profile?.region || '').trim();

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

    const alreadyFollowing = new Set(excludedUuid);
    alreadyFollowing.add(profileId);

    const baseSelect =
      'id, account_type, type, full_name, display_name, role, city, province, region, country, sport, avatar_url, status, updated_at';

    const normalizeAccountType = (value?: string | null) => {
      const cleaned = typeof value === 'string' ? value.toLowerCase().trim() : '';
      if (!cleaned) return null;
      if (cleaned === 'club') return 'club';
      if (cleaned === 'athlete' || cleaned === 'player') return 'athlete';
      return null;
    };

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

    async function runQuery(accountType: 'club' | 'athlete', filters: Array<(q: any) => any>, max: number) {
      let query = supabase
        .from('profiles')
        .select(baseSelect)
        .eq('account_type', accountType)
        .eq('status', 'active')
        .neq('id', profile?.id ?? '');

      filters.forEach((fn) => {
        query = fn(query);
      });

      query = applyExclusions(query);

      query = query.order('updated_at', { ascending: false }).limit(max);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    const buildLocation = (row: any) => [row.city, row.province, row.region, row.country].filter(Boolean).join(', ');

    const mapSuggestion = (row: any, athleteOverride?: any): Suggestion => {
      const normalizedType = normalizeAccountType(row.account_type ?? row.type);
      const kind = normalizedType === 'club' ? 'club' : 'player';
      const fullName = athleteOverride?.full_name ?? row.full_name ?? null;
      const displayName = athleteOverride?.display_name ?? row.display_name ?? null;
      const avatarUrl = athleteOverride?.avatar_url ?? row.avatar_url ?? null;
      const name =
        kind === 'club'
          ? buildClubDisplayName(fullName, displayName, 'Club')
          : buildPlayerDisplayName(fullName, displayName, 'Profilo');

      const resolvedNameSource = fullName ? 'full_name' : displayName ? 'display_name' : 'fallback';
      const resolvedAvatarSource = avatarUrl ? 'avatar_url' : 'fallback';

      return {
        id: row.id,
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
    const locationPriority: Array<{ field: 'city' | 'province' | 'region'; value: string | null }> = [
      { field: 'city', value: viewerCity || null },
      { field: 'province', value: viewerProvince || null },
      { field: 'region', value: viewerRegion || null },
    ];

    const buildFilters = () => {
      const filters: Array<Array<(q: any) => any>> = [];
      locationPriority.forEach((loc) => {
        if (loc.value) filters.push([(q) => q.eq(loc.field, loc.value)]);
      });
      if (viewerCountry) {
        filters.push([(q) => q.eq('country', viewerCountry)]);
      }
      if (profile.sport) {
        filters.push([(q) => q.eq('sport', profile.sport)]);
      }
      filters.push([]);
      return filters;
    };

    const clubFilters = buildFilters();
    const playerFilters = buildFilters();

    if (kind === 'club' || kind === 'player') {
      const accountType = kind === 'club' ? 'club' : 'athlete';
      const filters = kind === 'club' ? clubFilters : playerFilters;
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
      const verificationClient = serviceRoleClient ?? supabase;
      const { data: verificationRows, error: verificationError } = await verificationClient
        .from('club_verification_requests')
        .select('club_id, approved, paid, waived, verified_until, created_at')
        .in('club_id', clubIds)
        .order('created_at', { ascending: false });
      if (verificationError) throw verificationError;
      const nextMap = new Map<string, boolean>();
      const now = new Date();
      (verificationRows ?? []).forEach((row: any) => {
        if (!row?.club_id || nextMap.has(String(row.club_id))) return;
        const verifiedUntil = row.verified_until ? new Date(row.verified_until) : null;
        const isVerified =
          row.approved === true &&
          (row.paid === true || row.waived === true) &&
          Boolean(verifiedUntil && verifiedUntil > now);
        nextMap.set(String(row.club_id), isVerified);
      });
      clubVerificationMap = nextMap;
    }

    const items = rawResults.map((row) => ({
      ...mapSuggestion(row, athleteMap.get(String(row.id))),
      is_verified:
        normalizeAccountType(row?.account_type ?? row?.type) === 'club'
          ? clubVerificationMap.get(String(row.id)) ?? null
          : null,
    }));

    return successResponse({
      items,
      nextCursor: null,
      role,
      ...(debugMode
        ? {
            debug: {
              endpointVersion: ENDPOINT_VERSION,
              step,
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
