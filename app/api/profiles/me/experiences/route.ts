import { type NextRequest, NextResponse } from 'next/server';

import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import {
  isPastExperienceComplete,
  isPastExperienceEmpty,
  parseSeasonLabel,
  sanitizePastExperience,
  type PastExperience,
} from '@/lib/profiles/pastExperiences';
import { CanonicalSportWritePlanService } from '@/lib/taxonomy/canonicalSportWritePlanService.server';
import { planExperienceSportRequest, projectExperiencePrimarySport } from '@/lib/taxonomy/experienceSportRuntimeContract';
import { mapProfilePrimarySportContractError } from '@/lib/taxonomy/profilePrimarySportRuntimeContract';
import { SportsTaxonomyRepository, SupabaseSportsTaxonomyDataSource } from '@/lib/taxonomy/sportsTaxonomyRepository.server';
import { OrganizationMembershipError, validateOrganizationMembership } from '@/lib/sports/organizationMembership.server';

export const runtime = 'nodejs';
const MAX_EXPERIENCES = 50;

function sortBySeasonDescending(a: PastExperience, b: PastExperience) {
  const parsedA = parseSeasonLabel(a.season);
  const parsedB = parseSeasonLabel(b.season);
  const startA = parsedA?.startYear ?? 0;
  const startB = parsedB?.startYear ?? 0;
  return startB - startA;
}

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:EXPERIENCES:${user.id}`, limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) return jsonError(profileError.message, 400);
  if (!profile?.id) return NextResponse.json({ data: [] });

  const { data, error } = await supabase
    .from('athlete_experiences')
    .select('club_name, sport, role, category, country_id, start_year, end_year, sport_id, sport_discipline_id, sport_variant_id, sports_organization_id, sports_organization_category_id')
    .eq('profile_id', profile.id)
    .order('start_year', { ascending: false })
    .order('end_year', { ascending: false });

  if (error) return jsonError(error.message, 400);

  const experiences = (data || [])
    .map((item) => {
      const startYear = item.start_year;
      const endYear = item.end_year;
      if (typeof startYear !== 'number' || typeof endYear !== 'number' || endYear !== startYear + 1) {
        return null;
      }
      const experience = sanitizePastExperience({
        season: `${startYear}/${String(endYear % 100).padStart(2, '0')}`,
        club: item.club_name || '',
        sport: item.sport || '',
        role: item.role || '',
        category: item.category || '',
        countryId: item.country_id || '',
        organizationId: item.sports_organization_id || '',
        categoryId: item.sports_organization_category_id || '',
      });
      return { ...experience, primarySport: projectExperiencePrimarySport(item) };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort(sortBySeasonDescending);

  return NextResponse.json({ data: experiences });
});

export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `profiles:ME:EXPERIENCES:PATCH:${user.id}`, limit: 40, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = (await req.json().catch(() => ({}))) as { experiences?: unknown };
  const rawExperiences = Array.isArray(body.experiences) ? body.experiences : [];
  if (rawExperiences.length > MAX_EXPERIENCES) {
    return jsonError('invalid_input', 400, { code: 'invalid_input' });
  }
  const experiences: Array<PastExperience & { primarySport?: unknown }> = [];
  const rows: Array<Record<string, unknown>> = [];
  const planner = new CanonicalSportWritePlanService(
    new SportsTaxonomyRepository(new SupabaseSportsTaxonomyDataSource(supabase)),
  );

  for (let index = 0; index < rawExperiences.length; index += 1) {
    const value = rawExperiences[index];
    const raw = (value || {}) as Record<string, unknown>;
    const sanitizedInput = sanitizePastExperience(raw);
    if (isPastExperienceEmpty(sanitizedInput) && !Object.prototype.hasOwnProperty.call(raw, 'primarySport')) continue;
    try {
      const sport = await planExperienceSportRequest(raw, planner);
      const normalized = sanitizePastExperience({ ...raw, sport: sport.sport });
      if (!isPastExperienceComplete(normalized)) {
        return jsonError(`Compila tutti i campi dell'esperienza #${index + 1}.`, 400);
      }
      const parsedSeason = parseSeasonLabel(normalized.season);
      if (!parsedSeason) {
        return jsonError(`Seleziona una stagione valida per l'esperienza #${index + 1}.`, 400);
      }
      const { data: country } = await supabase.from('countries').select('id')
        .eq('id', normalized.countryId).eq('is_active', true).eq('is_supported', true).maybeSingle();
      if (!country) return jsonError('invalid_experience_country', 400, { code: 'invalid_experience_country' });
      if (normalized.organizationId && normalized.categoryId) {
        try {
          await validateOrganizationMembership(supabase, {
            organizationId: normalized.organizationId,
            categoryId: normalized.categoryId,
            sportId: sport.sport_id,
            disciplineId: sport.sport_discipline_id,
            variantId: sport.sport_variant_id,
            countryId: normalized.countryId,
          });
        } catch (membershipError) {
          const code = membershipError instanceof OrganizationMembershipError ? membershipError.code : 'invalid_registration';
          return jsonError(code, 400, { code });
        }
      }
      const canonicalExperience = { ...normalized, sport: sport.sport ?? '', primarySport: {
        sportId: sport.sport_id,
        disciplineId: sport.sport_discipline_id,
        variantId: sport.sport_variant_id,
      } };
      experiences.push(canonicalExperience);
      rows.push({
        club_name: canonicalExperience.club,
        sport: canonicalExperience.sport,
        role: canonicalExperience.role,
        category: canonicalExperience.category,
        country_id: canonicalExperience.countryId,
        sports_organization_id: canonicalExperience.organizationId || null,
        sports_organization_category_id: canonicalExperience.categoryId || null,
        start_year: parsedSeason.startYear,
        end_year: parsedSeason.endYear,
        sport_id: sport.sport_id,
        sport_discipline_id: sport.sport_discipline_id,
        sport_variant_id: sport.sport_variant_id,
      });
    } catch (error) {
      const mapped = error instanceof Error && error.message === 'experience_sport_required'
        ? { status: 400 as const, code: 'invalid_input' }
        : mapProfilePrimarySportContractError(error);
      return jsonError(mapped.code, mapped.status, { code: mapped.code });
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) return jsonError(profileError.message, 400);
  if (!profile?.id) return jsonError('Profilo non trovato.', 404);

  const { error: replaceError } = await supabase.rpc('replace_my_athlete_experiences', { p_experiences: rows });
  if (replaceError) {
    const mapped = mapProfilePrimarySportContractError(replaceError);
    return jsonError(mapped.code, mapped.status, { code: mapped.code });
  }

  return NextResponse.json({ data: experiences });
});
