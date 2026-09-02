import type { NextRequest } from 'next/server';

import { dbError, invalidPayload, notFoundResponse, successResponse, unknownError } from '@/lib/api/standardResponses';
import { GeoReadError, getCountryGeoAreaChildren, getGeoAreas, UUID_PATTERN } from '@/lib/geo/areas';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')?.trim().toUpperCase() ?? '';
  const parentParam = req.nextUrl.searchParams.get('parentId');
  const levelParam = req.nextUrl.searchParams.get('level');
  const activeParam = req.nextUrl.searchParams.get('active');

  if (!/^[A-Z]{2}$/.test(country)) return invalidPayload('country must be an ISO2 code');
  if (parentParam && !UUID_PATTERN.test(parentParam)) return invalidPayload('parentId must be a UUID');

  const level = levelParam == null || levelParam === '' ? undefined : Number(levelParam);
  if (level != null && (!Number.isInteger(level) || level < 1)) return invalidPayload('level must be a positive integer');
  if (activeParam != null && activeParam !== 'true' && activeParam !== 'false') return invalidPayload('active must be true or false');

  try {
    const supabase = await getSupabaseServerClient();
    const data = parentParam
      ? await getCountryGeoAreaChildren(supabase, country, parentParam)
      : await getGeoAreas(supabase, {
          countryIso2: country,
          parentId: null,
          level,
          active: activeParam == null ? true : activeParam === 'true',
        });
    return successResponse({ data });
  } catch (error) {
    if (error instanceof GeoReadError) {
      if (error.code === 'AREA_NOT_FOUND') return notFoundResponse(error.message);
      return invalidPayload(error.message, { code: error.code });
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return dbError(String(error.message));
    }
    return unknownError({ endpoint: 'geo/areas', error });
  }
}
