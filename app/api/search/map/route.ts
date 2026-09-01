import type { NextRequest } from 'next/server';

import { dbError, invalidPayload, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { rateLimit } from '@/lib/api/rateLimit';
import { buildProfileDisplayName } from '@/lib/displayName';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { provinceDisplayValue } from '@/lib/geo/provinceAbbreviations';
import { getProvinceAbbreviationsServer } from '@/lib/geo/provinceAbbreviations.server';
import { isProfileComplete } from '@/lib/profiles/completion';
import { applyPublicProfileVisibilityFilters } from '@/lib/profile/visibility';
import { MapGeographyContractError, resolveOpportunityMapPlacement, resolvePublicMapPoint } from '@/lib/maps/geographyContract';
import { applyOrganizationMapBounds, resolveMapViewportFromParams, SupabaseMapViewportCatalog } from '@/lib/maps/geography.server';
import { attachOpportunityGeography } from '@/lib/opportunities/geography';

export const runtime = 'nodejs';

type SearchMapRow = {
  account_type?: string | null;
  type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  friendly_name?: string | null;
} & Record<string, unknown>;

type GenericStringError = { error: true };

type Bounds = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

type Filters = {
  sport?: string | null;
  clubCategory?: string | null;
  foot?: string | null;
  gender?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
};

function toIlikePattern(value: string) {
  const escaped = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

function clampLimit(value: number | undefined) {
  if (!value && value !== 0) return 100;
  return Math.min(500, Math.max(10, Math.floor(value)));
}

function parseFilters(url: URL): Filters {
  const cleanText = (key: string) => {
    const raw = url.searchParams.get(key);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  const toNumber = (key: string) => {
    const raw = url.searchParams.get(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  return {
    sport: cleanText('sport'),
    clubCategory: cleanText('club_category'),
    foot: cleanText('foot'),
    gender: cleanText('gender'),
    ageMin: toNumber('age_min'),
    ageMax: toNumber('age_max'),
  };
}

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'search:map', limit: 120, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const limit = clampLimit(Number(url.searchParams.get('limit') || '100'));
  const filters = parseFilters(url);
  const searchQuery = (url.searchParams.get('query') || url.searchParams.get('q') || '').trim();
  const ilikeQuery = searchQuery ? toIlikePattern(searchQuery) : null;
  const debugMode = url.searchParams.get('debug') === '1';
  const requestedUserId = url.searchParams.get('current_user_id');
  const currentYear = new Date().getFullYear();

  try {
    const supabase = await getSupabaseServerClient();
    const viewport = await resolveMapViewportFromParams(url.searchParams, new SupabaseMapViewportCatalog(supabase));
    const bounds: Bounds = viewport?.bounds ?? {};
    const provinceAbbreviations = await getProvinceAbbreviationsServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (type === 'player' || type === 'athlete') {
      return successResponse({
        data: [],
        total: 0,
        privacyBoundary: 'precise_personal_map_points_disabled',
        viewport: viewport ? {
          source: viewport.source,
          countryId: viewport.countryId,
          geoAreaId: viewport.geoAreaId,
          bounds: viewport.bounds,
        } : null,
      });
    }

    const select = [
      'id',
      'user_id',
      'display_name',
      'full_name',
      'bio',
      'account_type',
      'type',
      'status',
      'is_admin',
      'country',
      'region',
      'province',
      'city',
      'avatar_url',
      'sport',
      'role',
      'latitude',
      'longitude',
      'club_stadium_lat',
      'club_stadium_lng',
      'club_league_category',
      'foot',
      'birth_year',
      'gender',
      'interest_region_id',
      'interest_province_id',
      'interest_municipality_id',
    ].join(',');

    const baseQuery = () =>
      applyPublicProfileVisibilityFilters(
        supabase.from('profiles').select(select, { count: 'exact' }),
      )
        .limit(limit)
        .neq('is_admin', true)
        .or('account_type.in.(club,institution),type.in.(club,institution)');

    const applyFilters = (query: ReturnType<typeof baseQuery>) => {
      let filtered = query;

      if (user?.id) {
        filtered = filtered.neq('user_id', user.id).neq('id', user.id);
      }

      if (type === 'club') {
        filtered = filtered.or('account_type.eq.club,type.eq.club');
      }
      // E2 privacy contract: precise personal coordinates are never implicit public pins.

      if (filters.sport) filtered = filtered.ilike('sport', filters.sport);
      if (filters.clubCategory) filtered = filtered.ilike('club_league_category', filters.clubCategory);
      if (filters.foot) filtered = filtered.ilike('foot', filters.foot);
      if (filters.gender) filtered = filtered.eq('gender', filters.gender);

      if (ilikeQuery) {
        filtered = filtered.or(
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
      }

      if (filters.ageMin != null) {
        filtered = filtered.lte('birth_year', currentYear - filters.ageMin);
      }
      if (filters.ageMax != null) {
        filtered = filtered.gte('birth_year', currentYear - filters.ageMax);
      }

      return filtered;
    };

    const hasBounds = viewport !== null;

    const applyBounds = (
      query: ReturnType<typeof baseQuery>,
      { withBounds }: { withBounds: boolean }
    ) => {
      if (!withBounds || !viewport) return query;
      return applyOrganizationMapBounds(query, viewport.bounds);
    };

    const runQuery = async ({ withBounds }: { withBounds: boolean }) => {
      const q = applyBounds(applyFilters(baseQuery()), { withBounds });
      return q;
    };

    if (type === 'opportunity') {
      let debug: {
        q: string;
        bounds: Bounds;
        status: string;
        totalOpenOpp: number;
        oppAfterText: number;
        clubsInBoundsCount: number;
        oppAfterBounds: number;
        sampleOpp: { id: string; title?: string | null; club_id?: string | null; status?: string | null } | null;
      } | null = null;
      let clubQuery = applyPublicProfileVisibilityFilters(
        supabase.from('profiles').select('id, user_id, account_type, type, latitude, longitude, club_stadium_lat, club_stadium_lng'),
      )
        .neq('is_admin', true)
        .or('account_type.eq.club,type.eq.club');

      if (viewport) clubQuery = applyOrganizationMapBounds(clubQuery, viewport.bounds);

      const { data: clubsData, error: clubsError } = await clubQuery.limit(300);
      if (clubsError) return dbError(clubsError.message);

      const clubIds = Array.from(new Set((clubsData ?? []).map((c: any) => c.id).filter(Boolean)));
      const clubOwnerIds = Array.from(new Set((clubsData ?? []).flatMap((c: any) => [c.id, c.user_id]).filter(Boolean)));
      const clubPoints = new Map((clubsData ?? []).flatMap((club: any) => {
        try {
          const point = resolvePublicMapPoint({
            accountType: club.account_type ?? club.type,
            venue: { latitude: club.club_stadium_lat, longitude: club.club_stadium_lng },
            legacyProfile: { latitude: club.latitude, longitude: club.longitude },
          });
          return point && club.id
            ? [club.id, club.user_id].filter(Boolean).map((id) => [String(id), point] as const)
            : [];
        } catch {
          return [];
        }
      }));

      const oppSelect = [
        'id',
        'title',
        'description',
        'city',
        'province',
        'region',
        'country',
        'country_id',
        'geo_area_id',
        'club_name',
        'club_id',
        'owner_id',
        'created_by',
        'created_at',
      ].join(',');

      const hasTextQuery = Boolean(ilikeQuery);
      const boundsApplied = hasBounds && clubIds.length > 0;

      let oppQuery = supabase
        .from('opportunities')
        .select(oppSelect)
        .order('created_at', { ascending: false })
        .limit(hasTextQuery ? 100 : Math.min(limit, 100))
        .eq('status', 'open');

      if (hasBounds) {
        if (clubIds.length) {
          oppQuery = oppQuery.or(
            [
              `club_id.in.(${clubIds.join(',')})`,
              `owner_id.in.(${clubOwnerIds.join(',')})`,
              `created_by.in.(${clubOwnerIds.join(',')})`,
            ].join(','),
          );
        } else if (hasBounds) {
          if (debugMode) {
            debug = {
              q: searchQuery,
              bounds,
              status: 'open',
              totalOpenOpp: 0,
              oppAfterText: 0,
              clubsInBoundsCount: 0,
              oppAfterBounds: 0,
              sampleOpp: null,
            };
          }
          return successResponse({ data: [], total: 0, boundsApplied: false, ...(debug ? { debug } : {}) });
        }
      } else if (!hasTextQuery && clubIds.length) {
        oppQuery = oppQuery.or(
          [
            `club_id.in.(${clubIds.join(',')})`,
            `owner_id.in.(${clubOwnerIds.join(',')})`,
            `created_by.in.(${clubOwnerIds.join(',')})`,
          ].join(','),
        );
      }

      if (ilikeQuery) {
        oppQuery = oppQuery.or(
          [
            `title.ilike.${ilikeQuery}`,
            `description.ilike.${ilikeQuery}`,
            `city.ilike.${ilikeQuery}`,
            `province.ilike.${ilikeQuery}`,
            `region.ilike.${ilikeQuery}`,
            `country.ilike.${ilikeQuery}`,
            `club_name.ilike.${ilikeQuery}`,
          ].join(','),
        );
      }

      const { data: opps, error: oppErr } = await oppQuery;
      if (oppErr) return dbError(oppErr.message);

      const opportunitiesWithGeography = await attachOpportunityGeography(supabase, (opps ?? []) as Array<Record<string, any>>);
      const rows = opportunitiesWithGeography.flatMap((o: any) => {
        const ownerPoint = [o.club_id, o.owner_id, o.created_by]
          .flatMap((id) => id ? [clubPoints.get(String(id))] : [])
          .find(Boolean);
        const placement = resolveOpportunityMapPlacement({
          explicitVenue: { latitude: null, longitude: null },
          organizationPoint: ownerPoint ?? null,
          canonicalGeoAreaId: o.geo_area_id,
        });
        if (!placement) return [];
        const locationLabel = [o.city, provinceDisplayValue(o.province, provinceAbbreviations), o.region, o.country].filter(Boolean).join(' · ');
        return [{
          id: o.id,
          profile_id: o.id,
          type: 'opportunity',
          account_type: 'opportunity',
          title: o.title ?? 'Annuncio',
          description: o.description ?? null,
          club_name: o.club_name ?? null,
          club_id: o.club_id ?? o.owner_id ?? null,
          city: o.city ?? null,
          province: o.province ?? null,
          region: o.region ?? null,
          country: o.country ?? null,
          location_label: locationLabel || null,
          created_at: o.created_at ?? null,
          latitude: placement.latitude,
          longitude: placement.longitude,
          coordinate_source: placement.source,
          organization_coordinate_source: ownerPoint?.source ?? null,
          map_semantics: 'owner_public_point',
          canonical_geography_is_viewport_only: true,
          geography: o.geography,
        }];
      });

      const rankedRows = hasTextQuery
        ? [...rows]
            .map((row) => {
              const title = String(row.title ?? '').toLowerCase();
              const description = String(row.description ?? '').toLowerCase();
              const location = String(row.location_label ?? '').toLowerCase();
              const queryLower = searchQuery.toLowerCase();
              const score =
                (title.includes(queryLower) ? 3 : 0) +
                (description.includes(queryLower) ? 2 : 0) +
                (location.includes(queryLower) ? 1 : 0);
              return { row, score };
            })
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              const dateA = a.row.created_at ? new Date(a.row.created_at).getTime() : 0;
              const dateB = b.row.created_at ? new Date(b.row.created_at).getTime() : 0;
              return dateB - dateA;
            })
            .map((entry) => entry.row)
            .slice(0, 20)
        : rows;

      if (debugMode) {
        const [
          totalOpenResult,
          oppAfterTextResult,
          oppAfterBoundsResult,
          sampleOppResult,
        ] = await Promise.all([
          supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          ilikeQuery
            ? supabase
                .from('opportunities')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'open')
                .or(
                  [
                    `title.ilike.${ilikeQuery}`,
                    `description.ilike.${ilikeQuery}`,
                    `city.ilike.${ilikeQuery}`,
                    `province.ilike.${ilikeQuery}`,
                    `region.ilike.${ilikeQuery}`,
                  ].join(','),
                )
            : supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          boundsApplied
            ? supabase
                .from('opportunities')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'open')
                .or(
                  [
                    `club_id.in.(${clubIds.join(',')})`,
                    `owner_id.in.(${clubOwnerIds.join(',')})`,
                    `created_by.in.(${clubOwnerIds.join(',')})`,
                  ].join(','),
                )
            : supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open').limit(0),
          supabase
            .from('opportunities')
            .select('id,title,club_id,status')
            .eq('status', 'open')
            .limit(1),
        ]);

        debug = {
          q: searchQuery,
          bounds,
          status: 'open',
          totalOpenOpp: totalOpenResult.count ?? 0,
          oppAfterText: oppAfterTextResult.count ?? 0,
          clubsInBoundsCount: clubIds.length,
          oppAfterBounds: boundsApplied ? oppAfterBoundsResult.count ?? 0 : oppAfterTextResult.count ?? 0,
          sampleOpp: Array.isArray(sampleOppResult.data) && sampleOppResult.data.length
            ? {
                id: sampleOppResult.data[0]?.id,
                title: sampleOppResult.data[0]?.title ?? null,
                club_id: sampleOppResult.data[0]?.club_id ?? null,
                status: sampleOppResult.data[0]?.status ?? null,
              }
            : null,
        };
      }

      return successResponse({
        data: rankedRows,
        total: rankedRows.length,
        boundsApplied,
        placementContract: 'opportunity_owner_public_point_v1',
        ...(debug ? { debug } : {}),
      });
    }

    const firstQuery = await runQuery({ withBounds: true });
    const { data, error, count } = await firstQuery;

    if (error) return dbError(error.message);

    const rawRows = (Array.isArray(data) ? data : []) as Array<
      SearchMapRow | GenericStringError
    >;
    let total = count ?? rawRows.length;
    const rows = rawRows
      .filter(
        (row): row is SearchMapRow =>
          !!row && typeof row === 'object' && !('error' in row)
      )
      .map((row) => {
        const rawType =
          typeof row.account_type === 'string' && row.account_type.trim()
            ? row.account_type
            : row.type;

        const profileId =
          typeof (row as any)?.id === 'string'
            ? (row as any).id
            : typeof (row as any)?.profile_id === 'string'
              ? (row as any).profile_id
              : null;

        const userId =
          typeof (row as any)?.user_id === 'string'
            ? (row as any).user_id
            : null;

        const normalizedType = (() => {
          if (typeof rawType !== 'string') return undefined;
          const t = rawType.trim().toLowerCase();
          if (t === 'player') return 'athlete';
          if (t === 'club' || t === 'athlete') return t;
          return t;
        })();

        let point = null;
        try {
          point = resolvePublicMapPoint({
            accountType: typeof rawType === 'string' ? rawType : null,
            venue: { latitude: (row as any)?.club_stadium_lat, longitude: (row as any)?.club_stadium_lng },
            legacyProfile: { latitude: (row as any)?.latitude, longitude: (row as any)?.longitude },
          });
        } catch {
          // Invalid public coordinate pairs fail closed per row.
        }

        const friendlyName = buildProfileDisplayName(row.full_name, row.display_name, 'Profilo');

        return {
          ...row,
          id: profileId,
          profile_id: profileId,
          user_id: userId,
          type: normalizedType,
          account_type: normalizedType ?? (row as any)?.account_type ?? null,
          latitude: point?.latitude ?? null,
          longitude: point?.longitude ?? null,
          coordinate_source: point?.source ?? null,
          full_name: row.full_name ?? null,
          display_name: row.display_name ?? null,
          friendly_name: friendlyName,
        } as SearchMapRow;
      })
      .filter((row) => {
        if (!row || !row.id) return false;
        if (user?.id && (row.user_id === user.id || row.id === user.id)) return false;
        if (requestedUserId && (row.user_id === requestedUserId || row.id === requestedUserId)) return false;
        if (!isProfileComplete(row)) return false;
        if (row.latitude == null || row.longitude == null) return false;
        return true;
      });

    total = rows.length;
    return successResponse({
      data: rows,
      total,
      viewport: viewport ? {
        source: viewport.source,
        countryId: viewport.countryId,
        geoAreaId: viewport.geoAreaId,
        bounds: viewport.bounds,
      } : null,
    });
  } catch (err: any) {
    if (err instanceof MapGeographyContractError) return invalidPayload(err.message, { reason: err.code });
    return unknownError({ endpoint: 'search/map', error: err, message: 'Errore ricerca mappa' });
  }
}
