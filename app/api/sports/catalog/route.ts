import { dbError, successResponse } from '@/lib/api/standardResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SPORTS } from '@/lib/opps/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const [sports, disciplines, variants, legacyMappings] = await Promise.all([
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
    supabase
      .from('legacy_sport_mappings')
      .select('legacy_display_label,sport_id,discipline_id,variant_id')
      .eq('is_active', true)
      .order('normalized_source_value'),
  ]);

  const error = sports.error ?? disciplines.error ?? variants.error ?? legacyMappings.error;
  if (error) return dbError('Impossibile caricare il catalogo sportivo.');

  const activeSportIds = new Set((sports.data ?? []).map((sport) => sport.id));
  const activeDisciplineIds = new Set((disciplines.data ?? []).map((discipline) => discipline.id));
  const activeVariantIds = new Set((variants.data ?? []).map((variant) => variant.id));
  const seenLegacyLabels = new Set<string>();
  const legacySportOrder = new Map(SPORTS.map((label, index) => [label, index]));
  const legacySports = (legacyMappings.data ?? []).filter((mapping) => {
    const label = mapping.legacy_display_label?.trim();
    if (!label || seenLegacyLabels.has(label) || !activeSportIds.has(mapping.sport_id)) return false;
    if (mapping.discipline_id && !activeDisciplineIds.has(mapping.discipline_id)) return false;
    if (mapping.variant_id && !activeVariantIds.has(mapping.variant_id)) return false;
    seenLegacyLabels.add(label);
    return true;
  }).map((mapping) => ({
    legacyValue: mapping.legacy_display_label,
    sportId: mapping.sport_id,
    disciplineId: mapping.discipline_id,
    variantId: mapping.variant_id,
  })).sort((left, right) => (legacySportOrder.get(left.legacyValue) ?? Number.MAX_SAFE_INTEGER)
    - (legacySportOrder.get(right.legacyValue) ?? Number.MAX_SAFE_INTEGER));

  return successResponse({
    sports: sports.data ?? [],
    disciplines: disciplines.data ?? [],
    variants: variants.data ?? [],
    legacySports,
  });
}
