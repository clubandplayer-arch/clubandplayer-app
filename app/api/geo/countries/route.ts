import { dbError, successResponse, unknownError } from '@/lib/api/standardResponses';
import { getSupportedCountries } from '@/lib/geo/countryCatalog';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    return successResponse({ data: await getSupportedCountries(supabase) });
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) return dbError(String(error.message));
    return unknownError({ endpoint: 'geo/countries', error });
  }
}
