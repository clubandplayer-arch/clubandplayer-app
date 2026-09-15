import { dbError, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sportsOrganizationDisplayName } from '@/lib/sports/organizationDisplay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const countryId = new URL(request.url).searchParams.get('countryId');
  const [organizations, organizationCategories] = await Promise.all([
    supabase.from('sports_organizations')
      .select('id,code,canonical_name,organization_type,display_order')
      .eq('is_active', true).order('display_order').order('canonical_name'),
    (() => {
      let query = supabase.from('sports_organization_categories')
        .select('id,organization_id,country_id,sport_id,discipline_id,variant_id,code,canonical_name,display_order')
        .eq('is_active', true);
      if (countryId) query = query.eq('country_id', countryId);
      return query.order('display_order').order('canonical_name');
    })(),
  ]);
  const error = organizations.error ?? organizationCategories.error;
  if (error) return dbError('Impossibile caricare enti e categorie.');
  const orderedOrganizations = (organizations.data ?? []).map((organization) => ({
    ...organization,
    display_name: sportsOrganizationDisplayName(organization.code, organization.canonical_name),
  }));
  return successResponse({ organizations:orderedOrganizations, organizationCategories:organizationCategories.data ?? [] });
}
