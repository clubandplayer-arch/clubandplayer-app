import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { notAuthorized, successResponse, unknownError } from '@/lib/api/feedFollowStandardWrapper';
import { getActiveProfile } from '@/lib/api/profile';
import { buildProfileDisplayName } from '@/lib/displayName';

export const runtime = 'nodejs';

function normalizeAccountType(value?: string | null) {
  return typeof value === 'string' ? value.toLowerCase() : null;
}

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthorized('Profilo non trovato');

    const { data: rows, error } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', me.id)
      .neq('target_profile_id', me.id);
    if (error) throw error;

    const targetIds = (rows || []).map((r) => (r as any)?.target_profile_id).filter(Boolean);
    if (!targetIds.length) return successResponse({ items: [] });

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, account_type, type, avatar_url, city, country, sport, role')
      .in('id', targetIds);
    if (profError) throw profError;

    const athleteIds = (profiles || [])
      .filter((p) => normalizeAccountType(p.account_type ?? (p as any)?.type) === 'athlete')
      .map((p) => p.id)
      .filter(Boolean);

    const athleteMap = new Map<
      string,
      { id: string | null; user_id: string | null; full_name: string | null; display_name: string | null; avatar_url: string | null }
    >();

    if (athleteIds.length) {
      const { data: athletes, error: athError } = await supabase
        .from('athletes_view')
        .select('id, user_id, full_name, display_name, avatar_url')
        .in('id', athleteIds);
      if (athError) throw athError;
      for (const athlete of athletes ?? []) {
        if (athlete.id) {
          athleteMap.set(athlete.id as string, {
            id: athlete.id as string,
            user_id: (athlete as any).user_id ?? null,
            full_name: (athlete as any).full_name ?? null,
            display_name: (athlete as any).display_name ?? null,
            avatar_url: (athlete as any).avatar_url ?? null,
          });
        }
      }
    }

    const items = (profiles || []).map((p) => {
      const accountType = p.account_type ?? (p as any)?.type ?? null;
      const normalizedType = normalizeAccountType(accountType);
      const athlete = normalizedType === 'athlete' ? athleteMap.get(p.id) : null;
      const fullName = athlete?.full_name ?? p.full_name ?? null;
      const displayName = athlete?.display_name ?? p.display_name ?? null;
      const avatarUrl = athlete?.avatar_url ?? p.avatar_url ?? null;

      return {
        id: p.id,
        name: buildProfileDisplayName(fullName, displayName, 'Profilo'),
        full_name: fullName,
        display_name: displayName,
        account_type: accountType,
        city: p.city,
        country: p.country,
        sport: p.sport,
        role: p.role,
        avatar_url: avatarUrl,
      };
    });

    return successResponse({ items });
  } catch (error: any) {
    console.error('[api/follows/list] errore', { error });
    return unknownError({ endpoint: '/api/follows/list', error, context: { userId: user.id } });
  }
});
