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

    const followerMatches = [
      `follower_profile_id.eq.${me.id}`,
      `follower_id.eq.${user.id}`,
      `follower_user_id.eq.${user.id}`,
    ];

    const { data: rows, error } = await supabase
      .from('follows')
      .select('id, target_profile_id, target_user_id, target_id, target_type, follower_profile_id, follower_user_id, follower_id, created_at')
      .or(followerMatches.join(','))
      .limit(500);
    if (error) throw error;

    const profileTargetIds = new Set<string>();
    const userTargetIds = new Set<string>();

    for (const row of rows || []) {
      const anyRow = row as any;
      if (anyRow?.target_profile_id) profileTargetIds.add(String(anyRow.target_profile_id));
      if (anyRow?.target_id) profileTargetIds.add(String(anyRow.target_id));
      if (anyRow?.target_user_id) userTargetIds.add(String(anyRow.target_user_id));
    }

    const targetIds = Array.from(profileTargetIds);
    const targetUserIds = Array.from(userTargetIds);

    if (!targetIds.length && !targetUserIds.length) {
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
                columnsUsed: ['target_profile_id', 'target_user_id', 'target_id'],
              }
            : undefined,
      });
    }

    const idsFetched = new Set<string>();
    const profiles: any[] = [];

    if (targetIds.length) {
      const { data: byProfile, error: profError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, display_name, account_type, avatar_url, city, country, sport, role')
        .in('id', targetIds);
      if (profError) throw profError;
      (byProfile || []).forEach((p: any) => {
        profiles.push(p);
        idsFetched.add(String(p.id));
      });
    }

    const remainingUserIds = targetUserIds.filter((uid) => !Array.from(idsFetched).includes(uid));
    if (remainingUserIds.length) {
      const { data: byUser, error: profError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, display_name, account_type, avatar_url, city, country, sport, role')
        .in('user_id', remainingUserIds);
      if (profError) throw profError;
      (byUser || []).forEach((p: any) => profiles.push(p));
    }

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
              columnsUsed: ['follower_profile_id', 'follower_id', 'follower_user_id', 'target_profile_id', 'target_user_id', 'target_id'],
            }
          : undefined,
    });
  } catch (error: any) {
    console.error('[api/follows/list] errore', { error });
    return unknownError({ endpoint: '/api/follows/list', error, context: { userId: user.id } });
  }
});
