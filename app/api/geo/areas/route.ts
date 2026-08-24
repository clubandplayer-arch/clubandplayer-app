import type { NextRequest } from 'next/server';

import { dbError, invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';
import { getGeoAreas } from '@/lib/geo/areas';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const data = await getGeoAreas(supabase, {
      countryIso2: country,
      parentId: parentParam === '' ? null : parentParam ?? undefined,
      level,
      active: activeParam == null ? true : activeParam === 'true',
    });
    return successResponse({ data });
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      return dbError(String(error.message));
    }
    return unknownError({ endpoint: 'geo/areas', error });
  }
}
