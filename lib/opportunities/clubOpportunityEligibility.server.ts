import type { SupabaseClient } from '@supabase/supabase-js';

export class ClubOpportunityEligibilityError extends Error {
  constructor(public readonly code: string) { super(code); }
}

async function isWithinArea(client: SupabaseClient, areaId: string, boundaryId: string, countryId: string) {
  let cursor: string | null = areaId;
  for (let depth = 0; cursor && depth < 16; depth += 1) {
    if (cursor === boundaryId) return true;
    const result = await client.from('geo_areas').select('parent_id,country_id').eq('id', cursor).eq('is_active', true).maybeSingle();
    const data = result.data as { parent_id: string | null; country_id: string } | null;
    const { error } = result;
    if (error || !data || data.country_id !== countryId) return false;
    cursor = data.parent_id;
  }
  return false;
}

export async function assertClubOpportunityEligibility(client: SupabaseClient, input: {
  clubProfileId: string;
  registrationId: string | null;
  countryId: string | null;
  geoAreaId: string | null;
}) {
  const { data: preference, error: preferenceError } = await client.from('profile_preferences')
    .select('residence_country_id,residence_geo_area_id').eq('profile_id', input.clubProfileId).maybeSingle();
  if (preferenceError) throw preferenceError;
  if (!preference?.residence_country_id || !preference.residence_geo_area_id) {
    throw new ClubOpportunityEligibilityError('club_canonical_geography_required');
  }
  if (!input.countryId || input.countryId !== preference.residence_country_id) {
    throw new ClubOpportunityEligibilityError('opportunity_country_must_match_club');
  }
  if (!input.geoAreaId || !(await isWithinArea(client, input.geoAreaId, preference.residence_geo_area_id, preference.residence_country_id))) {
    throw new ClubOpportunityEligibilityError('opportunity_area_outside_club_scope');
  }
  if (!input.registrationId) throw new ClubOpportunityEligibilityError('active_club_registration_required');
  const { data: registration, error } = await client.from('club_sport_registrations')
    .select('id,sport_id,sport_discipline_id,sport_variant_id,sports_organization_id,sports_organization_category_id,category:sports_organization_categories!inner(country_id)')
    .eq('id', input.registrationId).eq('club_profile_id', input.clubProfileId).eq('is_active', true).maybeSingle();
  if (error || !registration) throw new ClubOpportunityEligibilityError('active_club_registration_required');
  const category = Array.isArray(registration.category) ? registration.category[0] : registration.category;
  if (category?.country_id !== preference.residence_country_id) {
    throw new ClubOpportunityEligibilityError('club_registration_country_mismatch');
  }
  return registration;
}
