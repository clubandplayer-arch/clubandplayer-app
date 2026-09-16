// app/api/opportunities/route.ts
import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeToEN, PLAYING_CATEGORY_EN } from '@/lib/enums';
import { COUNTRIES } from '@/lib/geo/countries';
import { normalizeOpportunityGender, toOpportunityDbValue } from '@/lib/opps/gender';
import { normalizeSport } from '@/lib/opps/constants';
import { dbError, invalidPayload, notAuthorized, rateLimited, successResponse } from '@/lib/api/standardResponses';
import {
  attachOpportunityGeography,
  buildOpportunityGeographyWritePlan,
  getOpportunityGeoAreaFilterScope,
  OpportunityGeographyError,
  parseOpportunityGeographyCommand,
  resolveOpportunityGeography,
} from '@/lib/opportunities/geography';
import { CanonicalSportWritePlanService } from '@/lib/taxonomy/canonicalSportWritePlanService.server';
import { planProfilePrimarySportRequest } from '@/lib/taxonomy/profilePrimarySportRuntimeContract';
import { SportsTaxonomyRepository, SupabaseSportsTaxonomyDataSource } from '@/lib/taxonomy/sportsTaxonomyRepository.server';
import { projectOpportunityCanonicalContext, resolveOpportunityRoleColumns } from '@/lib/opportunities/canonicalSportsContext.server';
import { applyCanonicalSportFilters } from '@/lib/search/canonicalSportFilters';
import { OrganizationMembershipError, validateOrganizationMembership } from '@/lib/sports/organizationMembership.server';
import { assertClubOpportunityEligibility, ClubOpportunityEligibilityError } from '@/lib/opportunities/clubOpportunityEligibility.server';

export const runtime = 'nodejs';

const MIN_FUZZY_SEARCH_CHARS = 2;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function bracketToRange(code?: string): { age_min: number | null; age_max: number | null } {
  switch ((code || '').trim()) {
    case '17-20':
      return { age_min: 17, age_max: 20 };
    case '21-25':
      return { age_min: 21, age_max: 25 };
    case '26-30':
      return { age_min: 26, age_max: 30 };
    case '31+':
      return { age_min: 31, age_max: null };
    default:
      return { age_min: null, age_max: null };
  }
}

function norm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s && s !== '[object Object]' ? s : null;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.value === 'string' && any.value) ||
      (typeof any.label === 'string' && any.label) ||
      (typeof any.nome === 'string' && any.nome) ||
      (typeof any.name === 'string' && any.name) ||
      (typeof any.description === 'string' && any.description) ||
      '';
    const out = String(s).trim();
    return out ? out : null;
  }
  return String(v).trim() || null;
}

function resolveGender(value: unknown): string | null {
  const normalized = normalizeOpportunityGender(value);
  return normalized ? toOpportunityDbValue(normalized, 'canonical') : null;
}

function resolveCanonicalGenderCode(value: unknown): string | null {
  const normalized = normalizeOpportunityGender(value);
  return normalized ? toOpportunityDbValue(normalized, 'fallback') : null;
}

function parseRoleGroup(value: unknown): 'player' | 'staff' | null {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'player' || normalized === 'staff') return normalized;
  return null;
}

/** GET /api/opportunities — pubblico */
export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, { key: 'opps:GET', limit: 60, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  const supabase = await getSupabaseServerClient();

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = clamp(Number(url.searchParams.get('pageSize') || '20'), 1, 100);
  const sort = (url.searchParams.get('sort') || 'recent') as 'recent' | 'oldest';

  const countryRaw = (url.searchParams.get('country') || '').trim();
  const countryOption = COUNTRIES.find((c) => c.code === countryRaw);
  const country = countryOption?.label ?? countryRaw;
  const region = (url.searchParams.get('region') || '').trim();
  const province = (url.searchParams.get('province') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const countryId = (url.searchParams.get('countryId') || url.searchParams.get('country_id') || '').trim();
  const geoAreaId = (url.searchParams.get('geoAreaId') || url.searchParams.get('geo_area_id') || '').trim();
  const club = (url.searchParams.get('club') || '').trim();
  const clubId = (url.searchParams.get('clubId') || url.searchParams.get('club_id') || '').trim();
  const sport = normalizeSport((url.searchParams.get('sport') || '').trim()) ?? '';
  const sportId = (url.searchParams.get('sportId') || url.searchParams.get('sport_id') || '').trim();
  const disciplineId = (url.searchParams.get('disciplineId') || url.searchParams.get('sport_discipline_id') || '').trim();
  const variantId = (url.searchParams.get('variantId') || url.searchParams.get('sport_variant_id') || '').trim();
  const playerPositionId = (url.searchParams.get('playerPositionId') || url.searchParams.get('player_position_id') || '').trim();
  const staffRoleId = (url.searchParams.get('staffRoleId') || url.searchParams.get('staff_role_id') || '').trim();
  const genderCode = (url.searchParams.get('genderCode') || url.searchParams.get('gender_code') || '').trim();
  const role = (url.searchParams.get('role') || '').trim();
  const roleGroupParam = url.searchParams.get('role_group') || url.searchParams.get('roleGroup');
  const roleGroup = parseRoleGroup(roleGroupParam);
  const ageB = (url.searchParams.get('age') || '').trim();
  const category = (url.searchParams.get('category') || url.searchParams.get('required_category') || '').trim();
  const rawStatus = (url.searchParams.get('status') || '').trim().toLowerCase();
  const allowedStatuses = new Set(['open', 'closed', 'archived', 'draft']);
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  let query = supabase
    .from('opportunities')
    .select(
      'id,title,description,created_by,created_at,country,region,province,city,country_id,geo_area_id,sport,sport_id,sport_discipline_id,sport_variant_id,club_sport_registration_id,sports_organization_id,sports_organization_category_id,role,role_group,player_position_id,staff_role_id,category,required_category,age_min,age_max,club_name,gender,gender_code,owner_id,club_id,status',
    )
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);

  if (q.length >= MIN_FUZZY_SEARCH_CHARS)
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,region.ilike.%${q}%,province.ilike.%${q}%,country.ilike.%${q}%,sport.ilike.%${q}%,role.ilike.%${q}%`,
    );
  if (countryId || geoAreaId) {
    try {
      const areaScope = await getOpportunityGeoAreaFilterScope(supabase, countryId, geoAreaId);
      query = query.eq('country_id', countryId);
      if (areaScope) query = query.in('geo_area_id', areaScope);
    } catch (error) {
      if (error instanceof OpportunityGeographyError) return invalidPayload(error.message);
      return dbError(error instanceof Error ? error.message : 'Unable to validate geography filters');
    }
  } else {
    if (country && country !== '[object Object]') query = query.eq('country', country);
    if (region && region !== '[object Object]') query = query.eq('region', region);
    if (province && province !== '[object Object]') query = query.eq('province', province);
    if (city && city !== '[object Object]') query = query.eq('city', city);
  }
  if (clubId) query = query.or(`club_id.eq.${clubId},owner_id.eq.${clubId},created_by.eq.${clubId}`);
  if (club) query = query.ilike('club_name', `%${club}%`);
  if (sportId) {
    query = applyCanonicalSportFilters(
      query,
      {
        sportId,
        disciplineId: disciplineId || null,
        variantId: variantId || null,
      },
      sport,
    );
  } else {
    if (sport) query = query.eq('sport', sport);
    if (disciplineId) query = query.eq('sport_discipline_id', disciplineId);
    if (variantId) query = query.eq('sport_variant_id', variantId);
  }
  if (playerPositionId) query = query.eq('player_position_id', playerPositionId);
  if (staffRoleId) query = query.eq('staff_role_id', staffRoleId);
  if (genderCode) query = query.eq('gender_code', genderCode);
  if (role) query = query.eq('role', role);
  if (roleGroup) query = query.eq('role_group', roleGroup);
  if (category) query = query.eq('category', category);
  if (rawStatus && allowedStatuses.has(rawStatus)) {
    query = query.eq('status', rawStatus);
  }
  if (ageB) {
    const { age_min, age_max } = bracketToRange(ageB);
    if (age_min != null) query = query.gte('age_min', age_min);
    if (age_max != null) query = query.lte('age_max', age_max);
    if (age_max == null) query = query.is('age_max', null);
  }

  const { data, error } = await query;
  if (error) return dbError(error.message);

  const fetchedRows = (data ?? []) as Array<Record<string, any>>;
  const hasMore = fetchedRows.length > pageSize;
  const rows = hasMore ? fetchedRows.slice(0, pageSize) : fetchedRows;
  const ownerIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.created_by, r.owner_id, (r as any).club_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let clubNameMap: Record<string, string> = {};
  if (ownerIds.length) {
    const [profilesById, profilesByUser] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, display_name, full_name')
        .in('id', ownerIds),
      supabase
        .from('profiles')
        .select('id, user_id, display_name, full_name')
        .in('user_id', ownerIds),
    ]);

    const allProfiles = [...(profilesById.data || []), ...(profilesByUser.data || [])];

    clubNameMap = allProfiles.reduce((acc, row) => {
      const name = row.full_name || row.display_name;
      if (name) {
        if (row.id) acc[row.id] = name;
        if (row.user_id) acc[row.user_id] = name;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  const enriched = rows.map((row) => {
    const ownerId = row.created_by ?? row.owner_id ?? null;
    const clubIdValue = row.club_id ?? ownerId;
    const clubName = row.club_name ?? (clubIdValue ? clubNameMap[clubIdValue] : ownerId ? clubNameMap[ownerId] : null) ?? null;
    const roleGroup = parseRoleGroup(row.role_group) ?? 'player';
    return {
      ...row,
      ...projectOpportunityCanonicalContext(row),
      owner_id: ownerId,
      created_by: ownerId,
      club_id: row.club_id ?? ownerId ?? null,
      role_group: roleGroup,
      roleGroup,
      club_name: clubName,
      clubName,
    };
  });

  const withGeography = await attachOpportunityGeography(supabase, enriched);
  return successResponse({
    data: withGeography,
    q,
    page,
    pageSize,
    total: from + enriched.length + (hasMore ? 1 : 0),
    totalIsExact: false,
    hasMore,
    pageCount: hasMore ? page + 1 : page,
    sort,
  });
}

/** POST /api/opportunities — club only; scrittura compat owner_id/created_by */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'opps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return rateLimited('Too Many Requests');
  }

  // verifica club
  const metaRole = String(user.user_metadata?.role ?? '').toLowerCase();
  let isClub = metaRole === 'club';
  if (!isClub) {
    const { data } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .maybeSingle();
    const acct = data?.account_type as string | null | undefined;
    isClub = String(acct ?? '').toLowerCase() === 'club';
  }
  if (!isClub) return notAuthorized('forbidden_not_club');

  const { data: profileByUser } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const clubProfile = profileByUser ?? null;
  if (!clubProfile) return invalidPayload('club_profile_not_found');

  const clubId = clubProfile.id;

  const body = await req.json().catch(() => ({}));
  let geographyCommand;
  try {
    geographyCommand = parseOpportunityGeographyCommand(body as Record<string, unknown>);
  } catch (error) {
    if (error instanceof OpportunityGeographyError) return invalidPayload(error.code);
    throw error;
  }
  const title = norm((body as any).title);
  if (!title) return invalidPayload('Title is required');

  const description = norm((body as any).description);
  const country = norm((body as any).country);
  const region = norm((body as any).region);
  const province = norm((body as any).province);
  const city = norm((body as any).city);
  const legacySportInput = normalizeSport(norm((body as any).sport)) ?? null;
  const roleHuman =
    norm((body as any).role) ??
    norm((body as any).roleLabel) ??
    norm((body as any).roleValue);
  const club_name = clubProfile.full_name ?? null;
  if (!club_name) return invalidPayload('club_name_missing');
  const { age_min, age_max } = bracketToRange((body as any).age_bracket);
  const genderDb = resolveGender((body as any).gender);
  const genderCode = resolveCanonicalGenderCode((body as any).gender);
  if (!genderDb) return invalidPayload('invalid_gender');

  const roleGroupRaw = (body as any).role_group ?? (body as any).roleGroup ?? null;
  const roleGroup = parseRoleGroup(roleGroupRaw);
  if (roleGroupRaw != null && !roleGroup) return invalidPayload('invalid_role_group');
  const effectiveRoleGroup = roleGroup ?? 'player';

  // required_category → EN (solo Calcio + role_group player legacy)
  let required_category: string | null = null;
  if (legacySportInput === 'Calcio' && effectiveRoleGroup === 'player') {
    const candidate =
      norm((body as any).required_category) ??
      norm((body as any).requiredCategory) ??
      norm((body as any).playing_category) ??
      norm((body as any).playingCategory) ??
      roleHuman;

    const en = candidate ? normalizeToEN(candidate) : null;
    if (!en) {
      return invalidPayload('invalid_required_category', { allowed_en: PLAYING_CATEGORY_EN });
    }
    required_category = en;
  } else {
    required_category =
      norm((body as any).required_category) ??
      norm((body as any).requiredCategory) ??
      norm((body as any).playing_category) ??
      norm((body as any).playingCategory) ??
      null;
  }

  const category = norm((body as any).category);
  const registrationId = norm((body as any).club_sport_registration_id);
  const sportsOrganizationId = norm((body as any).sports_organization_id);
  const sportsOrganizationCategoryId = norm((body as any).sports_organization_category_id);
  if (Boolean(sportsOrganizationId) !== Boolean(sportsOrganizationCategoryId)) return invalidPayload('sports_organization_and_category_required_together');

  let canonicalSport;
  let canonicalRole;
  try {
    const planner = new CanonicalSportWritePlanService(
      new SportsTaxonomyRepository(new SupabaseSportsTaxonomyDataSource(supabase)),
    );
    canonicalSport = await planProfilePrimarySportRequest(body as Record<string, unknown>, planner);
    if (!canonicalSport) {
      canonicalSport = { sport: legacySportInput, sport_id: null, sport_discipline_id: null, sport_variant_id: null };
    }
    canonicalRole = await resolveOpportunityRoleColumns({
      supabase,
      body: body as Record<string, unknown>,
      roleGroup: effectiveRoleGroup,
      legacyRole: roleHuman,
      sport: canonicalSport,
    });
    if (canonicalSport.sport === 'Calcio' && effectiveRoleGroup === 'player') {
      const candidate = required_category ?? roleHuman;
      const normalizedCategory = candidate ? normalizeToEN(candidate) : null;
      if (!normalizedCategory) return invalidPayload('invalid_required_category', { allowed_en: PLAYING_CATEGORY_EN });
      required_category = normalizedCategory;
    }
  } catch (error) {
    return invalidPayload(error instanceof Error ? error.message : 'invalid_canonical_context');
  }

  const basePayload: Record<string, unknown> = {
    title,
    description,
    owner_id: user.id,
    created_by: user.id,
    club_id: clubId,
    country,
    region,
    province,
    city,
    role: roleHuman,
    role_group: effectiveRoleGroup,
    category,
    club_sport_registration_id: registrationId,
    sports_organization_id: sportsOrganizationId,
    sports_organization_category_id: sportsOrganizationCategoryId,
    required_category,
    age_min,
    age_max,
    club_name,
    gender: genderDb,
    ...canonicalSport,
    ...canonicalRole,
    gender_code: genderCode,
  };

  if (registrationId) {
    const { data: registration } = await supabase.from('club_sport_registrations').select('*').eq('id', registrationId).eq('club_profile_id', clubId).eq('is_active', true).maybeSingle();
    if (!registration || registration.sport_id !== canonicalSport.sport_id || registration.sport_discipline_id !== canonicalSport.sport_discipline_id || registration.sport_variant_id !== canonicalSport.sport_variant_id || registration.sports_organization_id !== sportsOrganizationId || registration.sports_organization_category_id !== sportsOrganizationCategoryId) return invalidPayload('invalid_club_registration');
  }

  try {
    await validateOrganizationMembership(supabase, {
      organizationId:sportsOrganizationId, categoryId:sportsOrganizationCategoryId,
      sportId:(canonicalSport.sport_id as string|null) ?? null,
      disciplineId:(canonicalSport.sport_discipline_id as string|null) ?? null,
      variantId:(canonicalSport.sport_variant_id as string|null) ?? null,
    });
  } catch (error) {
    if (error instanceof OrganizationMembershipError) return invalidPayload(error.code);
    throw error;
  }

  if (geographyCommand.kind === 'absent' || geographyCommand.kind === 'legacy') {
    return invalidPayload('canonical_opportunity_geography_required');
  } else {
    try {
      Object.assign(basePayload, await buildOpportunityGeographyWritePlan(supabase, geographyCommand));
    } catch (error) {
      if (error instanceof OpportunityGeographyError) return invalidPayload(error.code);
      throw error;
    }
  }

  try {
    await assertClubOpportunityEligibility(supabase, {
      clubProfileId: clubId,
      registrationId,
      countryId: (basePayload.country_id as string | null) ?? null,
      geoAreaId: (basePayload.geo_area_id as string | null) ?? null,
    });
  } catch (error) {
    if (error instanceof ClubOpportunityEligibilityError) return invalidPayload(error.code);
    throw error;
  }

  const runInsert = (payload: Record<string, unknown>) =>
    supabase
      .from('opportunities')
      .insert(payload)
      .select(
        'id,title,description,created_by,created_at,country,region,province,city,country_id,geo_area_id,sport,sport_id,sport_discipline_id,sport_variant_id,club_sport_registration_id,sports_organization_id,sports_organization_category_id,role,role_group,player_position_id,staff_role_id,category,required_category,age_min,age_max,club_name,gender,gender_code,club_id',
      )
      .single();

  // primo tentativo con owner_id
  let { data, error } = await runInsert(basePayload);

  // se lo schema non ha owner_id, riprova senza
  if (error && /column .*owner_id.* does not exist/i.test(error.message || '')) {
    const { owner_id: _ownerId, ...fallback } = basePayload;
    ({ data, error } = await runInsert(fallback));
  }

  if (error) return dbError(error.message);
  const normalizedData = data ? { ...data, ...projectOpportunityCanonicalContext(data), role_group: parseRoleGroup((data as any).role_group) ?? 'player', roleGroup: parseRoleGroup((data as any).role_group) ?? 'player', geography: await resolveOpportunityGeography(supabase, data as Record<string, unknown>) } : data;
  return successResponse({ data: normalizedData }, { status: 201 });
});
