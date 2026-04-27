import { jsonError, withAuth } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/standardResponses';
import { getActiveProfile } from '@/lib/api/profile';
import type { NotificationWithActor } from '@/types/notifications';

export const runtime = 'nodejs';
const ENDPOINT_VERSION = 'notifications@2026-01-05a';

const isEmailLike = (value: unknown): value is string =>
  typeof value === 'string' && /@/.test(value);

const cleanName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || isEmailLike(trimmed)) return null;
  return trimmed;
};

const resolveActorPublicName = (params: { viewRow: any; base: any }) => {
  const { viewRow, base } = params;
  const fallback = (base?.account_type ?? '').toLowerCase() === 'club' ? 'Club' : 'Player';
  return (
    cleanName(viewRow?.display_name) ||
    cleanName(viewRow?.full_name) ||
    cleanName(base?.full_name) ||
    cleanName(base?.display_name) ||
    fallback
  );
};

export const GET = withAuth(async (req, { supabase, user }) => {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 20, 50));
    const all = url.searchParams.get('all') === '1';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const debugMode = url.searchParams.get('debug') === '1';

    const base = supabase
      .from('notifications')
      .select('id, kind, payload, created_at, updated_at, read_at, read, actor_profile_id, recipient_profile_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const paginated = all ? base.range((page - 1) * limit, page * limit - 1) : base.limit(limit);

    const { data, error } = unreadOnly ? await paginated.is('read_at', null) : await paginated;
    if (error) return jsonError(error.message, 500);

    const actorIds = Array.from(new Set((data ?? []).map((n) => n.actor_profile_id).filter(Boolean))) as string[];
    const { data: actors, error: actorsError } = actorIds.length
      ? await supabase
          .from('profiles')
          .select('id, display_name, full_name, avatar_url, account_type')
          .in('id', actorIds)
      : { data: [] as any[], error: null };
    if (actorsError) {
      console.error('[notifications/list] actor profiles error', actorsError);
    }

    const baseActorMap = new Map<string, any>((actors ?? []).map((p: any) => [String(p.id), p]));
    const athleteIds = (actors ?? [])
      .filter((p: any) => (p.account_type ?? '').toLowerCase() === 'athlete')
      .map((p: any) => p.id);
    const clubIds = (actors ?? [])
      .filter((p: any) => (p.account_type ?? '').toLowerCase() === 'club')
      .map((p: any) => p.id);

    const [athletesRes, clubsRes] = await Promise.all([
      athleteIds.length
        ? supabase.from('athletes_view').select('id, display_name, full_name').in('id', athleteIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      clubIds.length
        ? supabase.from('clubs_view').select('id, display_name').in('id', clubIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    if (athletesRes.error) console.error('[notifications/list] athletes_view error', athletesRes.error);
    if (clubsRes.error) console.error('[notifications/list] clubs_view error', clubsRes.error);

    const athleteNameMap = new Map<string, any>();
    (athletesRes.data ?? []).forEach((row: any) => row?.id && athleteNameMap.set(String(row.id), row));
    const clubNameMap = new Map<string, any>();
    (clubsRes.data ?? []).forEach((row: any) => row?.id && clubNameMap.set(String(row.id), row));

    const items: NotificationWithActor[] = (data ?? []).map((row) => {
      if (!row.actor_profile_id) {
        return { ...row, actor: null };
      }
      const base = baseActorMap.get(String(row.actor_profile_id));
      if (!base) {
        return { ...row, actor: null };
      }
      const kind = (base.account_type ?? '').toLowerCase();
      const viewRow =
        kind === 'athlete'
          ? athleteNameMap.get(String(base.id))
          : kind === 'club'
          ? clubNameMap.get(String(base.id))
          : null;
      const publicName = resolveActorPublicName({ viewRow, base });
      return {
        ...row,
        actor: {
          id: String(base.id),
          account_type: base.account_type ?? null,
          avatar_url: base.avatar_url ?? null,
          public_name: publicName,
        },
      };
    });

    if (!debugMode) {
      return successResponse({ data: items });
    }

    const profile = await getActiveProfile(supabase, user.id);
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) {
      return jsonError('Errore conteggio notifiche', 500, {
        endpointVersion: ENDPOINT_VERSION,
        message: countError.message,
      });
    }
    return successResponse({
      data: items,
      debug: {
        endpointVersion: ENDPOINT_VERSION,
        meUserId: user.id,
        meProfileId: profile?.id ?? null,
        filter: { table: 'notifications', column: 'user_id', value: user.id },
        returned: items.length,
        notificationsTotalInDbForUser: count ?? 0,
      },
    });
  } catch (e: any) {
    console.error('[notifications/list] errore', e);
    return jsonError(e?.message || 'Errore inatteso', 500);
  }
});

export const PATCH = withAuth(async (req, { supabase, user }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; markAll?: boolean };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string') : [];
    const markAll = body.markAll === true;

    const updateBuilder = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), read: true }, { count: 'exact' })
      .eq('user_id', user.id);

    const { error, count } = markAll
      ? await updateBuilder
      : ids.length
      ? await updateBuilder.in('id', ids)
      : { error: null, count: 0 } as const;

    if (error) return jsonError(error.message, 500);

    return successResponse({ updated: count || 0 });
  } catch (e: any) {
    console.error('[notifications/update] errore', e);
    return jsonError(e?.message || 'Errore inatteso', 500);
  }
});
