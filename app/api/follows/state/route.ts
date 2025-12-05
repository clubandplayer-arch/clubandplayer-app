import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { notAuthorized, successResponse, unknownError, validationError } from '@/lib/api/feedFollowResponses';
import { getActiveProfile } from '@/lib/api/profile';
import { FollowStateQuerySchema, type FollowStateQueryInput } from '@/lib/validation/follow';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const parsed = FollowStateQuerySchema.safeParse({ targets: url.searchParams.getAll('targets') });
  if (!parsed.success) return validationError('Parametri non validi', parsed.error.flatten());
  const { targets }: FollowStateQueryInput = parsed.data;

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');

    const cleanTargets = targets.filter((t) => t !== me.id);

    const { data, error } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', me.id)
      .in('target_profile_id', cleanTargets);
    if (error) throw error;

    const state: Record<string, boolean> = {};
    targets.forEach((t) => {
      if (t === me.id) {
        state[t] = false;
      } else {
        state[t] = Boolean(data?.some((row) => (row as any)?.target_profile_id === t));
      }
    });

    return successResponse({ state });
  } catch (error: any) {
    console.error('[api/follows/state] errore', { error });
    return unknownError({ endpoint: '/api/follows/state', error, context: { userId: user.id, targets } });
  }
});
