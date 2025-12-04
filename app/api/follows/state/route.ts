import type { NextRequest } from 'next/server';
import { badRequest, forbidden, internalError, ok } from '@/lib/api/responses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  const url = new URL(req.url);
  const targets = url.searchParams.getAll('targets').map((t) => t.trim()).filter(Boolean);
  if (!targets.length) return badRequest('targets mancanti');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return forbidden('Profilo non trovato');

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

    return ok({ state });
  } catch (error: any) {
    console.error('[api/follows/state] errore', { error });
    return internalError(error);
  }
});
