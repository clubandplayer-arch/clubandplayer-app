import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  notAuthorized,
  rlsDenied,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { getActiveProfile } from '@/lib/api/profile';
import { FollowStateQuerySchema } from '@/lib/validation/follow';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const me = await getActiveProfile(supabase, user.id);
  if (!me) {
    return notAuthorized('Profilo non trovato');
  }

  try {
    const url = new URL(req.url);

    const parsed = FollowStateQuerySchema.safeParse({
      targets: url.searchParams.getAll('targets'),
    });

    if (!parsed.success) {
      return validationError('Parametri non validi', parsed.error.flatten());
    }

    const { targets } = parsed.data;

    const cleanTargets = targets.filter((t) => t !== me.id);

    if (cleanTargets.length === 0) {
      return successResponse({ state: {} });
    }

    const { data, error } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', me.id)
      .in('target_profile_id', cleanTargets);

    if (error) {
      if (error.code === '42501') {
        return rlsDenied('Permessi insufficienti per leggere lo stato follow');
      }
      throw error;
    }

    const state: Record<string, boolean> = {};
    cleanTargets.forEach((t) => {
      state[t] = Boolean(data?.some((row) => (row as any)?.target_profile_id === t));
    });

    return successResponse({ state });
  } catch (error) {
    console.error('[api/follows/state] errore', { error });
    return unknownError({ endpoint: '/api/follows/state', error, context: { userId: user.id } });
  }
});
