import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { notAuthorized, successResponse, unknownError } from '@/lib/api/feedFollowStandardWrapper';
import { getActiveProfile } from '@/lib/api/profile';
import { buildProfileDisplayName } from '@/lib/displayName';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');

    const role = (() => {
      const raw = [me.account_type, me.profile_type, me.type]
        .map((v) => (v ?? '').toString().toLowerCase())
        .find((v) => v);
      if (!raw) return null;
      if (raw.includes('club')) return 'club';
      if (raw.includes('athlete') || raw.includes('player')) return 'athlete';
      return raw;
    })();

    const followerColumn = 'follower_profile_id';
    const targetColumn = 'target_profile_id';

    const { data: rows, error } = await supabase
      .from('follows')
      .select('id, target_profile_id, follower_profile_id, created_at')
      .eq(followerColumn, me.id)
      .limit(500);
    if (error) throw error;

    const targetIds = (rows || [])
      .map((r) => (r as any)?.[targetColumn])
      .filter(Boolean)
      .map((v) => String(v));

    if (!targetIds.length) {
      return successResponse({
        items: [],
        role,
        debug:
          process.env.NODE_ENV !== 'production'
            ? {
                userId: user.id,
                activeProfileId: me.id,
                activeProfileRole: role,
                followsCount: 0,
                sampleRows: (rows || []).slice(0, 3),
                columnsUsed: { followerCol: followerColumn, targetCol: targetColumn, followerValueUsed: me.id },
              }
            : undefined,
      });
    }

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, display_name, account_type, avatar_url, city, country, sport, role')
      .in('id', targetIds);
    if (profError) throw profError;

    const items = (profiles || []).map((p) => ({
      id: p.id,
      name: buildProfileDisplayName(p.full_name, p.display_name, 'Profilo'),
      full_name: p.full_name,
      display_name: p.display_name,
      account_type: p.account_type,
      city: p.city,
      country: p.country,
      sport: p.sport,
      role: p.role,
      avatar_url: p.avatar_url,
    }));

    return successResponse({
      items,
      role,
      debug:
        process.env.NODE_ENV !== 'production'
          ? {
              userId: user.id,
              activeProfileId: me.id,
              activeProfileRole: role,
              followsCount: items.length,
              sampleRows: (rows || []).slice(0, 3),
              columnsUsed: { followerCol: followerColumn, targetCol: targetColumn, followerValueUsed: me.id },
            }
          : undefined,
    });
  } catch (error: any) {
    console.error('[api/follows/list] errore', { error });
    return unknownError({ endpoint: '/api/follows/list', error, context: { userId: user.id } });
  }
});
