import type { NextRequest } from 'next/server';
import { dbError, invalidPayload, notFoundResponse, successResponse, unknownError } from '@/lib/api/standardResponses';
import { GeoReadError, getGeoAreaAncestors, getGeoAreaById } from '@/lib/geo/areas';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await getSupabaseServerClient();
    const area = await getGeoAreaById(supabase, id);
    if (!area) return notFoundResponse('geo area was not found');
    const ancestors = await getGeoAreaAncestors(supabase, id);
    return successResponse({ data: { area, ancestors } });
  } catch (error) {
    if (error instanceof GeoReadError) {
      if (error.code === 'AREA_NOT_FOUND') return notFoundResponse(error.message);
      return invalidPayload(error.message, { code: error.code });
    }
    if (error && typeof error === 'object' && 'message' in error) return dbError(String(error.message));
    return unknownError({ endpoint: 'geo/areas/[id]/ancestors', error });
  }
}
