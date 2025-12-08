import { withAuth } from '@/lib/api/auth';
import { dbError, invalidPayload, successResponse, unknownError } from '@/lib/api/standardResponses';
import { getRecommendedOpportunitiesForProfile } from '@/lib/opps/recommendations';

export const runtime = 'nodejs';

export const GET = withAuth(async (req, { supabase, user }) => {
  try {
    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get('limit') || '5');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const profileId = profile?.id ?? user.id;
    if (!profileId) return invalidPayload('Profilo non trovato');

    const recommendations = await getRecommendedOpportunitiesForProfile(profileId, {
      limit: rawLimit,
      supabase,
    });

    return successResponse({ data: recommendations });
  } catch (error) {
    if (error instanceof Error) {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'opportunities/recommended', error });
  }
});
