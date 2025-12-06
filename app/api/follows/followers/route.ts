import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { notAuthorized, successResponse, unknownError } from '@/lib/api/feedFollowResponses';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');

    const { data: rows, error } = await supabase
      .from('follows')
      .select('follower_profile_id')
      .eq('target_profile_id', me.id);
    if (error) throw error;

    const followerIds = (rows || []).map((r) => (r as any)?.follower_profile_id).filter(Boolean);
    if (!followerIds.length) return successResponse({ items: [] });

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, display_name, account_type, avatar_url, city, country, sport, role')
      .in('id', followerIds);
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

    return successResponse({ items });
  } catch (error: any) {
    console.error('[api/follows/followers] errore', { error });
    return unknownError({ endpoint: '/api/follows/followers', error, context: { userId: user.id } });
  }
});
