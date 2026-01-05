import { jsonError, withAuth } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/standardResponses';
import type { NotificationWithActor } from '@/types/notifications';

export const runtime = 'nodejs';

export const GET = withAuth(async (req, { supabase, user }) => {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 20, 50));
    const all = url.searchParams.get('all') === '1';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const base = supabase
      .from('notifications')
      .select('id, kind, payload, created_at, updated_at, read_at, read, actor_profile_id, recipient_profile_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const paginated = all ? base.range((page - 1) * limit, page * limit - 1) : base.limit(limit);

    const { data, error } = unreadOnly ? await paginated.is('read_at', null) : await paginated;
    if (error) return jsonError(error.message, 500);

    const actorIds = Array.from(new Set((data ?? []).map((n) => n.actor_profile_id).filter(Boolean))) as string[];
    const { data: actors } = actorIds.length
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, account_type, city, country')
          .in('id', actorIds)
      : { data: [] as any[] };

    const actorMap = Object.fromEntries((actors ?? []).map((p: any) => [p.id, p]));

    const items: NotificationWithActor[] = (data ?? []).map((row) => ({
      ...row,
      actor: row.actor_profile_id ? actorMap[row.actor_profile_id] ?? null : null,
    }));

    return successResponse({ data: items });
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
