// app/api/follows/suggestions/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { successResponse, validationError } from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FollowSuggestionsQuerySchema, type FollowSuggestionsQueryInput } from '@/lib/validation/follow';

export const runtime = 'nodejs';
const ENDPOINT_VERSION = 'follows-suggestions@2026-01-10a';

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
  const debugMode = url.searchParams.get('debug') === '1';
  let step = 'init';

  function errorResponse(params: {
    code: string;
    message: string;
    status?: number;
    error?: unknown;
  }) {
    const { code, message, status = 500, error } = params;
    const details = debugMode
      ? {
          endpointVersion: ENDPOINT_VERSION,
          step,
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : null,
          errorCode: (error as any)?.code ?? null,
        }
      : undefined;
    return NextResponse.json(
      { ok: false, code, message, ...(details ? { details } : {}) },
      { status },
    );
  }

  try {
    step = 'auth';
    const supabase = await getSupabaseServerClient();
    const { data: userRes, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[follows/suggestions] auth error', authError);
      return errorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Devi accedere per vedere i suggerimenti.',
        status: 401,
        error: authError,
      });
    }

    if (!userRes?.user) {
      return errorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Devi accedere per vedere i suggerimenti.',
        status: 401,
      });
    }

    step = 'meProfile';
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

    step = 'follows';
    const { data: existing, error: followsError } = await supabase
      .from('follows')
      .select('target_profile_id')
      .eq('follower_profile_id', profileId)
      .limit(200);
    if (followsError) throw followsError;

    const alreadyFollowing = new Set(
      (existing || [])
        .map((row) => (row as any)?.target_profile_id)
        .filter(Boolean)
        .map((id) => id.toString()),
    );

    const baseSelect =
      'id, account_type, full_name, display_name, role, city, country, sport, avatar_url, status, updated_at';

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

      query = query.order('updated_at', { ascending: false }).limit(limit);

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

    step = 'candidates';
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
      followers: null,
      account_type: p.account_type || targetProfileType,
    } as any));

    return successResponse({
      items,
      nextCursor: null,
      role,
    });
  } catch (err) {
    const error = err as any;
    console.error('[follows/suggestions] error', { step, error });
    const message = typeof error?.message === 'string' ? error.message : 'Errore server';
    const code = (() => {
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('rls')) {
        return 'RLS_DENIED';
      }
      if (message.toLowerCase().includes('column') && message.toLowerCase().includes('does not exist')) {
        return 'SCHEMA_MISMATCH';
      }
      if (typeof error?.code === 'string' && error.code === '42501') {
        return 'RLS_DENIED';
      }
      return 'DB_ERROR';
    })();
    return errorResponse({
      code,
      message: code === 'SCHEMA_MISMATCH' ? 'Schema non allineato per i suggerimenti.' : 'Errore server.',
      status: 500,
      error,
    });
  }
}
