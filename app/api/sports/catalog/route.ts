import { dbError, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const [sports, disciplines, variants] = await Promise.all([
    supabase
      .from('sports')
      .select('id,code,canonical_name,display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('canonical_name'),
    supabase
      .from('sport_disciplines')
      .select('id,sport_id,code,canonical_name,is_independently_selectable,display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('canonical_name'),
    supabase
      .from('sport_variants')
      .select('id,discipline_id,code,canonical_name,team_size,display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('canonical_name'),
  ]);

  const error = sports.error ?? disciplines.error ?? variants.error;
  if (error) return dbError('Impossibile caricare il catalogo sportivo.');

  return successResponse({
    sports: sports.data ?? [],
    disciplines: disciplines.data ?? [],
    variants: variants.data ?? [],
  });
}
