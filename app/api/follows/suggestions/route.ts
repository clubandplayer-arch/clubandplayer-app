// app/api/follows/suggestions/route.ts
import { type NextRequest } from 'next/server';
import { successResponse, unknownError, validationError } from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FollowSuggestionsQuerySchema, type FollowSuggestionsQueryInput } from '@/lib/validation/follow';

export const runtime = 'nodejs';

type Role = 'athlete' | 'club' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  followers?: number | null;
  account_type?: string | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = FollowSuggestionsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }
  const { limit }: FollowSuggestionsQueryInput = parsed.data;

  try {
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      return successResponse({ items: [], role: 'guest' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_type, status, country, city, interest_country, interest_city')
      .eq('user_id', userRes.user.id)
      .maybeSingle();

    const role =
      (profile?.account_type === 'athlete' || profile?.account_type === 'club'
        ? profile.account_type
        : 'guest') || 'guest';

    if (!profile?.id || profile.status !== 'active') {
      return successResponse({ items: [], role });
    }

    const profileId = profile.id;

    const targetProfileType: Role = role === 'club' ? 'athlete' : 'club';
    const viewerCountry = (profile?.interest_country || profile?.country || '').trim();

    const { data: existing } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profileId)
      .limit(200);

    const alreadyFollowing = new Set(
      (existing || [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .map((id) => id.toString()),
    );

    const baseSelect =
      'id, account_type, full_name, display_name, role, city, country, sport, avatar_url, followers_count, status';

    async function runQuery(filters: Array<(q: any) => any>) {
      let query = supabase
        .from('profiles')
        .select(baseSelect)
        .eq('account_type', targetProfileType)
        .eq('status', 'active')
        .neq('id', profile?.id ?? '');

      filters.forEach((fn) => {
        query = fn(query);
      });

      if (alreadyFollowing.size) {
        const values = Array.from(alreadyFollowing)
          .map((id) => `'${id}'`)
          .join(',');
        query = query.not('id', 'in', `(${values})`);
      }

      query = query.order('followers_count', { ascending: false }).limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    async function runFallbackQuery() {
      let query = supabase
        .from('profiles')
        .select(baseSelect)
        .eq('account_type', targetProfileType)
        .eq('status', 'active')
        .neq('id', profile?.id ?? '');

      if (alreadyFollowing.size) {
        const values = Array.from(alreadyFollowing)
          .map((id) => `'${id}'`)
          .join(',');
        query = query.not('id', 'in', `(${values})`);
      }

      query = query.order('updated_at', { ascending: false }).limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    let rows: any[] = await runQuery(
      viewerCountry ? [(q) => q.eq('country', viewerCountry)] : [],
    );
    if (rows.length === 0) {
      rows = await runFallbackQuery();
    }

    const items: Suggestion[] = rows.map((p) => ({
      id: p.id,
      name: (p.full_name || p.display_name || 'Profilo').toString(),
      city: p.city || null,
      country: p.country || null,
      role: p.role || null,
      sport: p.sport || null,
      avatar_url: p.avatar_url || null,
      followers: p.followers_count ?? null,
      account_type: p.account_type || targetProfileType,
    } as any));

    return successResponse({
      items,
      nextCursor: null,
      role,
    });
  } catch (err) {
    console.error('[follows/suggestions] error', err);
    return unknownError({ endpoint: '/api/follows/suggestions', error: err, context: { stage: 'handler' } });
  }
}
