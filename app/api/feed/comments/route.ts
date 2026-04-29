import { type NextRequest } from 'next/server';
import {
  dbError,
  notAuthenticated,
  notReady,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowStandardWrapper';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  CommentsQuerySchema,
  CreateCommentSchema,
  type CommentsQueryInput,
  type CreateCommentInput,
} from '@/lib/validation/feed';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getProfileByUserId } from '@/lib/api/profile';
import { sendPushForNotificationBestEffort } from '@/lib/push/sendExpoPush';

export const runtime = 'nodejs';

const MAX_LEN = 800;

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return text.slice(0, MAX_LEN);
}

function cleanName(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function toPushPreview(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 120);
}

const GROUPING_WINDOW_MINUTES = 10;

function extractNotificationPostId(payload: any): string | null {
  const postId = payload?.post_id ?? payload?.postId ?? payload?.target_id ?? payload?.targetId;
  if (typeof postId !== 'string') return null;
  const normalized = postId.trim();
  return normalized.length ? normalized : null;
}

function buildGroupedTitle(actorName: string, groupCount: number) {
  if (groupCount <= 1) return `${actorName} ha commentato il tuo post`;
  if (groupCount === 2) return `${actorName} e un altro hanno commentato il tuo post`;
  return `${actorName} e altri ${groupCount - 1} hanno commentato il tuo post`;
}

async function getGroupedMeta(params: { client: any; recipientUserId: string; postId: string; actorName: string }) {
  const { client, recipientUserId, postId, actorName } = params;
  const createdAt = new Date().toISOString();
  const windowStart = new Date(Date.now() - GROUPING_WINDOW_MINUTES * 60_000).toISOString();
  const { data } = await client
    .from('notifications')
    .select('payload, actor_profile_id, created_at')
    .eq('user_id', recipientUserId)
    .eq('kind', 'new_comment')
    .eq('read', false)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(30);

  const matching = (data ?? []).filter((row: any) => extractNotificationPostId(row?.payload) === postId);
  const actorProfileIds = Array.from(
    new Set(matching.map((row: any) => (row?.actor_profile_id ? String(row.actor_profile_id) : null)).filter(Boolean)),
  ) as string[];
  let actorNames: string[] = [];
  if (actorProfileIds.length) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, display_name, full_name')
      .in('id', actorProfileIds);
    actorNames = (profiles ?? [])
      .map((p: any) => cleanName(p?.display_name) || cleanName(p?.full_name))
      .filter((name: string | null): name is string => !!name);
  }
  if (actorName) actorNames.unshift(actorName);
  const uniqueActorNames = Array.from(new Set(actorNames)).slice(0, 5);
  const groupCount = Math.max(1, matching.length);
  return { createdAt, groupCount, actors: uniqueActorNames, title: buildGroupedTitle(actorName, groupCount) };
}

function buildGroupedPostPushPayload(params: {
  postId: string;
  actorName?: string;
  preview?: string;
  title: string;
  createdAt: string;
  groupCount: number;
  actors: string[];
}) {
  const { postId, actorName, preview, title, createdAt, groupCount, actors } = params;
  return {
    kind: 'new_comment' as const,
    type: 'new_comment' as const,
    title,
    ...(preview ? { body: preview } : {}),
    targetType: 'post',
    target_type: 'post',
    targetId: postId,
    target_id: postId,
    postId,
    post_id: postId,
    conversationId: undefined,
    conversation_id: undefined,
    actorName: actorName || undefined,
    actor_name: actorName || undefined,
    createdAt,
    created_at: createdAt,
    priority: 'default' as const,
    grouped: true,
    group_count: groupCount,
    actors,
  };
}

async function resolveActorPublicName(client: any, actorProfileId: string | null, actorProfile?: any) {
  if (!actorProfileId) return 'Qualcuno';

  const baseProfile = actorProfile?.id ? actorProfile : null;
  const baseName = cleanName(baseProfile?.display_name) || cleanName(baseProfile?.full_name);
  const accountType = String(baseProfile?.account_type ?? '').toLowerCase();

  if (accountType === 'club') {
    const { data: club } = await client.from('clubs_view').select('display_name').eq('id', actorProfileId).maybeSingle();
    return cleanName(club?.display_name) || baseName || 'Qualcuno';
  }

  if (accountType === 'athlete') {
    const { data: athlete } = await client
      .from('athletes_view')
      .select('display_name, full_name')
      .eq('id', actorProfileId)
      .maybeSingle();
    return cleanName(athlete?.display_name) || cleanName(athlete?.full_name) || baseName || 'Qualcuno';
  }

  if (baseName) return baseName;
  const { data: profile } = await client
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', actorProfileId)
    .maybeSingle();
  return cleanName(profile?.display_name) || cleanName(profile?.full_name) || 'Qualcuno';
}

async function buildClubVerificationMap(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, clubIds: string[]) {
  if (!clubIds.length) return new Map<string, boolean>();
  try {
    const admin = getSupabaseAdminClientOrNull();
    const verificationClient = admin ?? supabase;
    const { data, error } = await verificationClient
      .from('club_verification_requests')
      .select('club_id, status, payment_status, verified_until, created_at')
      .in('club_id', clubIds)
      .eq('status', 'approved')
      .in('payment_status', ['paid', 'waived'])
      .gt('verified_until', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throw error;
    const map = new Map<string, boolean>();
    (data ?? []).forEach((row: any) => {
      if (!row?.club_id || map.has(String(row.club_id))) return;
      map.set(String(row.club_id), true);
    });
    return map;
  } catch (error) {
    console.error('[api/feed/comments] club verification lookup failed', {
      message: error instanceof Error ? error.message : (error as any)?.message ?? null,
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      code: (error as any)?.code ?? null,
    });
    return new Map<string, boolean>();
  }
}

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const parsed = CommentsQuerySchema.safeParse(Object.fromEntries(search.entries()));

  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }

  const { postId, limit }: CommentsQueryInput = parsed.data;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 30);

  if (error) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01' || code === 'PGRST204') {
      return notReady('Commenti non pronti');
    }
    return unknownError({
      endpoint: '/api/feed/comments',
      error,
      context: { method: 'GET', stage: 'select', postId },
    });
  }

  const authorIds = Array.from(new Set((data ?? []).map((c) => c.author_id))).filter(Boolean) as string[];
  const authors: Record<string, any> = {};

  if (authorIds.length > 0) {
    const { data: profilesByUser } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
      .in('user_id', authorIds);

    const storeProfile = (p: any) => {
      if (!p) return;
      const keyUser = (p as any)?.user_id ? String((p as any).user_id) : null;
      const keyId = (p as any)?.id ? String((p as any).id) : null;
      if (keyUser) authors[keyUser] = p;
      if (keyId && !authors[keyId]) authors[keyId] = p;
    };

    (profilesByUser ?? []).forEach(storeProfile);

    const missingByUserId = authorIds.filter((id) => !authors[id]);

    if (missingByUserId.length) {
      const { data: profilesById } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
        .in('id', missingByUserId);

      (profilesById ?? []).forEach(storeProfile);
    }
  }

  const clubProfileIds = Array.from(
    new Set(
      Object.values(authors)
        .filter((author) => author?.account_type === 'club' && author?.id)
        .map((author) => String(author.id)),
    ),
  );
  const clubVerificationMap = await buildClubVerificationMap(supabase, clubProfileIds);

  const comments = (data ?? []).map((c) => ({
    ...c,
    author: (() => {
      const author = authors[c.author_id || ''] ?? null;
      if (!author) return null;
      const isClub = author.account_type === 'club';
      const isVerified = isClub ? clubVerificationMap.get(String(author.id)) ?? false : null;
      return { ...author, is_verified: isVerified };
    })(),
  }));

  return successResponse({ comments });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const bodyJson = await req.json().catch(() => ({}));
  const parsed = CreateCommentSchema.safeParse(bodyJson);
  if (!parsed.success) {
    console.warn('[api/feed/comments][POST] invalid payload', parsed.error.flatten());
    return validationError('Payload non valido', parsed.error.flatten());
  }

  const payload: CreateCommentInput = parsed.data;
  const postId = payload.postId;
  const body = sanitizeBody(payload.body);

  if (!body) {
    return validationError('Commento vuoto');
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, body, author_id: auth.user.id })
    .select('id, post_id, author_id, body, created_at')
    .maybeSingle();

  if (error || !data) {
    const code = (error as any)?.code as string | undefined;
    if (code === '42501' || code === '42P01') {
      return notReady('Commenti non pronti');
    }
    return dbError('Errore nel salvataggio del commento', { message: error?.message });
  }

  try {
    const admin = getSupabaseAdminClientOrNull();
    const notificationsClient = admin ?? supabase;

    const { data: postRow } = await notificationsClient
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .maybeSingle();

    const postAuthorId = postRow?.author_id ? String(postRow.author_id) : null;

    let recipientUserId: string | null = null;
    let recipientProfileId: string | null = null;

    if (postAuthorId) {
      const ownerByUser = await getProfileByUserId(notificationsClient, postAuthorId, { activeOnly: true });

      if (ownerByUser?.id && ownerByUser.user_id) {
        recipientProfileId = String(ownerByUser.id);
        recipientUserId = String(ownerByUser.user_id);
      } else {
        const { data: ownerById } = await notificationsClient
          .from('profiles')
          .select('id, user_id')
          .eq('id', postAuthorId)
          .maybeSingle();

        if (ownerById?.id) {
          recipientProfileId = String(ownerById.id);
          recipientUserId = ownerById.user_id ? String(ownerById.user_id) : null;
        }
      }
    }

    const actorByUser = await getProfileByUserId(notificationsClient, auth.user.id, { activeOnly: true });
    const actorProfileId = actorByUser?.id ? String(actorByUser.id) : null;
    const actorName = await resolveActorPublicName(notificationsClient, actorProfileId, actorByUser);
    const commentPreview = toPushPreview(body);

    const isSelfByUser = !!recipientUserId && recipientUserId === auth.user.id;
    const isSelfByProfile = !!recipientProfileId && !!actorProfileId && recipientProfileId === actorProfileId;
    console.info('[api/feed/comments][POST] notification resolution', {
      postId,
      commentId: data.id,
      postAuthorId,
      recipientUserId,
      recipientProfileId,
      actorProfileId,
      isSelfByUser,
      isSelfByProfile,
    });

    if (recipientUserId && recipientProfileId && !isSelfByUser && !isSelfByProfile) {
      const notificationPayload = {
        user_id: recipientUserId,
        recipient_profile_id: recipientProfileId,
        actor_profile_id: actorProfileId,
        kind: 'new_comment',
        payload: {
          post_id: postId,
          comment_id: data.id,
        },
        read: false,
      };
      const { data: insertedNotification, error: notificationError } = await notificationsClient
        .from('notifications')
        .insert(notificationPayload)
        .select('id')
        .maybeSingle();

      if (notificationError) {
        console.warn('[api/feed/comments][POST] failed to insert notification', {
          postId,
          commentId: data.id,
          recipientUserId,
          recipientProfileId,
          actorProfileId,
          notificationPayload,
          message: notificationError.message,
        });
      } else if (insertedNotification?.id) {
        const groupedMeta = await getGroupedMeta({
          client: notificationsClient,
          recipientUserId,
          postId,
          actorName: actorName || 'Qualcuno',
        });
        const pushSummary = await sendPushForNotificationBestEffort({
          supabase: notificationsClient,
          userId: recipientUserId,
          notificationId: String(insertedNotification.id),
          kind: 'new_comment',
          payload: buildGroupedPostPushPayload({
            postId,
            actorName,
            preview: commentPreview,
            title: groupedMeta.title,
            createdAt: groupedMeta.createdAt,
            groupCount: groupedMeta.groupCount,
            actors: groupedMeta.actors,
          }),
        });
        console.info('[api/feed/comments][POST] push dispatch summary', {
          postId,
          commentId: data.id,
          notificationId: insertedNotification.id,
          recipientUserId,
          pushSummary,
        });
      }
    }
  } catch (notificationErr: any) {
    console.warn('[api/feed/comments][POST] notification flow failed', {
      postId,
      commentId: data.id,
      message: notificationErr?.message,
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, display_name, avatar_url, account_type, status')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const verificationMap = profile?.id ? await buildClubVerificationMap(supabase, [String(profile.id)]) : new Map();
  const isClub = profile?.account_type === 'club';
  const profileWithVerification = profile
    ? { ...profile, is_verified: isClub ? verificationMap.get(String(profile.id)) ?? false : null }
    : null;

  return successResponse({
    comment: {
      ...data,
      author: profileWithVerification,
    },
  });
}