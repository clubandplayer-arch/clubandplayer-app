import type { NextRequest } from 'next/server';
import { forbidden, internalError, ok } from '@/lib/api/responses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return forbidden('Profilo non trovato');

    const { data: rows, error } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', me.id)
      .neq('target_profile_id', me.id);
    if (error) throw error;

    const targetIds = (rows || []).map((r) => (r as any)?.target_profile_id).filter(Boolean);
    if (!targetIds.length) return ok({ items: [] });

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, display_name, account_type, avatar_url, city, country, sport, role')
      .in('id', targetIds);
    if (profError) throw profError;

    const items = (profiles || []).map((p) => ({
      id: p.id,
      name: p.display_name || 'Profilo',
      account_type: p.account_type,
      city: p.city,
      country: p.country,
      sport: p.sport,
      role: p.role,
      avatar_url: p.avatar_url,
    }));

    return ok({ items });
  } catch (error: any) {
    console.error('[api/follows/list] errore', { error });
    return internalError(error);
  }
});
