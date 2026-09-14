import { dbError, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const [organizations, organizationCategories] = await Promise.all([
    supabase.from('sports_organizations')
      .select('id,code,canonical_name,organization_type,display_order')
      .eq('is_active', true).order('display_order').order('canonical_name'),
    supabase.from('sports_organization_categories')
      .select('id,organization_id,sport_id,discipline_id,variant_id,code,canonical_name,display_order')
      .eq('is_active', true).order('display_order').order('canonical_name'),
  ]);
  const error = organizations.error ?? organizationCategories.error;
  if (error) return dbError('Impossibile caricare enti e categorie.');
  return successResponse({ organizations:organizations.data ?? [], organizationCategories:organizationCategories.data ?? [] });
}
