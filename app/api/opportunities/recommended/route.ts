import { withAuth } from '@/lib/api/auth';
import { badRequest, internalError, ok } from '@/lib/api/responses';
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
    if (!profileId) return badRequest('Profilo non trovato');

    const recommendations = await getRecommendedOpportunitiesForProfile(profileId, {
      limit: rawLimit,
      supabase,
    });

    return ok({ data: recommendations });
  } catch (error) {
    return internalError(error, 'Errore nel calcolo delle opportunità suggerite');
  }
});
