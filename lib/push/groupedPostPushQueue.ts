import { sendPushForNotificationBestEffort } from '@/lib/push/sendExpoPush';

const DEBOUNCE_SECONDS = 90;

function cleanName(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function buildGroupedTitle(kind: 'new_comment' | 'new_reaction', actorName: string, groupCount: number) {
  const suffix = kind === 'new_comment' ? 'commentato il tuo post' : 'reagito al tuo post';
  if (groupCount <= 1) return `${actorName} ha ${suffix}`;
  if (groupCount === 2) return `${actorName} e un altro hanno ${suffix}`;
  return `${actorName} e altri ${groupCount - 1} hanno ${suffix}`;
}

function buildPayload(params: {
  kind: 'new_comment' | 'new_reaction'; postId: string; actorName: string; groupCount: number; actors: string[]; body?: string;
}) {
  const { kind, postId, actorName, groupCount, actors, body } = params;
  return {
    kind,
    type: kind,
    title: buildGroupedTitle(kind, actorName, groupCount),
    ...(body ? { body } : {}),
    targetType: 'post',
    target_type: 'post',
    targetId: postId,
    target_id: postId,
    postId,
    post_id: postId,
    actorName,
    actor_name: actorName,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    priority: kind === 'new_reaction' ? 'low' : 'default',
    grouped: true,
    group_count: groupCount,
    actors,
  };
}

export async function enqueueGroupedPostPush(params: {
  client: any; recipientUserId: string; kind: 'new_comment' | 'new_reaction'; postId: string; actorName: string; latestNotificationId: number | string; body?: string;
}) {
  const { client, recipientUserId, kind, postId, actorName, latestNotificationId, body } = params;
  const nowIso = new Date().toISOString();
  const scheduledAt = new Date(Date.now() + DEBOUNCE_SECONDS * 1000).toISOString();
  const safeActorName = cleanName(actorName) || 'Qualcuno';
  const safeBody = typeof body === 'string' ? body.trim().slice(0, 120) : '';

  const { data: existing } = await client
    .from('grouped_push_queue')
    .select('id, group_count, actors, payload')
    .eq('recipient_user_id', recipientUserId)
    .eq('kind', kind)
    .eq('post_id', postId)
    .is('sent_at', null)
    .maybeSingle();

  const existingActors = Array.isArray(existing?.actors) ? existing.actors : [];
  const actors = Array.from(new Set([safeActorName, ...existingActors].filter((v) => typeof v === 'string' && v.trim()))).slice(0, 8);
  const groupCount = Math.max(1, Number(existing?.group_count || 0) + 1);
  const payload = buildPayload({ kind, postId, actorName: safeActorName, groupCount, actors, body: safeBody || undefined });

  if (existing?.id) {
    await client
      .from('grouped_push_queue')
      .update({
        latest_notification_id: latestNotificationId,
        group_count: groupCount,
        actors,
        payload,
        scheduled_at: scheduledAt,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
      .is('sent_at', null);
    return;
  }

  await client.from('grouped_push_queue').insert({
    recipient_user_id: recipientUserId,
    kind,
    post_id: postId,
    latest_notification_id: latestNotificationId,
    group_count: 1,
    actors: [safeActorName],
    payload,
    scheduled_at: scheduledAt,
  });
}

export async function flushGroupedPostPushes(client: any) {
  const lockTs = new Date().toISOString();
  const nowIso = new Date().toISOString();

  const { data: rows } = await client
    .from('grouped_push_queue')
    .select('*')
    .is('sent_at', null)
    .is('locked_at', null)
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(100);

  const results: any[] = [];
  for (const row of rows ?? []) {
    const { data: locked } = await client
      .from('grouped_push_queue')
      .update({ locked_at: lockTs })
      .eq('id', row.id)
      .is('sent_at', null)
      .is('locked_at', null)
      .select('id')
      .maybeSingle();

    if (!locked?.id) continue;

    const summary = await sendPushForNotificationBestEffort({
      supabase: client,
      userId: row.recipient_user_id,
      notificationId: String(row.latest_notification_id),
      kind: row.kind,
      payload: row.payload,
    });

    await client
      .from('grouped_push_queue')
      .update({ sent_at: new Date().toISOString(), locked_at: null, last_result: summary })
      .eq('id', row.id)
      .is('sent_at', null);

    results.push({ id: row.id, kind: row.kind, userId: row.recipient_user_id, summary });
  }

  return results;
}
