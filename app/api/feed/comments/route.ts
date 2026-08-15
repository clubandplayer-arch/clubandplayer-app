import { type NextRequest } from 'next/server';
import {
  dbError,
  notAuthenticated,
  notReady,
  rateLimited,
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
import { enqueueGroupedPostPush } from '@/lib/push/groupedPostPushQueue';
import { sendPushForNotificationBestEffort } from '@/lib/push/sendExpoPush';
import { rateLimit } from '@/lib/api/rateLimit';
import { maskEmailAddresses } from '@/lib/privacy/maskEmailAddresses';

export const runtime = 'nodejs';
const GROUPED_PUSH_DEBOUNCE_ENABLED = process.env.GROUPED_PUSH_DEBOUNCE_ENABLED === 'true';

const MAX_LEN = 800;

type MentionFollower = { id: string; user_id: string; display_name: string | null; full_name: string | null };

function sanitizeBody(raw: unknown) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  return maskEmailAddresses(text).slice(0, MAX_LEN);
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

function normalizeMentionToken(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function extractMentionTokens(value: string) {
  const tokens = new Set<string>();
  const hasAll = /(^|\s)@all\b/i.test(value);
  const matches = value.matchAll(/(^|\s)@([\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63})/gu);
  for (const match of matches) {
    const token = normalizeMentionToken(match[2] ?? '');
    if (token && token !== 'all') tokens.add(token);
  }
  return { hasAll, tokens };
}

function profileMentionAliases(profile: { display_name?: string | null; full_name?: string | null }) {
  const aliases = new Set<string>();
  for (const name of [profile.display_name, profile.full_name]) {
    const raw = typeof name === 'string' ? name.trim() : '';
    if (!raw) continue;
    aliases.add(normalizeMentionToken(raw));
    for (const part of raw.split(/\s+/)) {
      const normalized = normalizeMentionToken(part);
      if (normalized) aliases.add(normalized);
    }
  }
  return aliases;
}

async function fetchFollowersForMentions(client: any, targetProfileId: string) {
  const { data, error } = await client
    .from('follows')
    .select('follower:profiles!follows_follower_profile_id_fkey(id, user_id, display_name, full_name, status)')
    .eq('target_profile_id', targetProfileId)
    .limit(1000);

  if (error) {
    console.warn('[api/feed/comments][mentions] follower lookup failed', { message: error.message });
    return [] as MentionFollower[];
  }

  return (data ?? [])
    .map((row: any) => row?.follower)
    .filter((profile: any) => profile?.id && profile?.user_id && profile?.status === 'active')
    .map((profile: any): MentionFollower => ({
      id: String(profile.id),
      user_id: String(profile.user_id),
      display_name: profile.display_name ?? null,
      full_name: profile.full_name ?? null,
    }));
}

async function notifyMentionedFollowersInComment(params: {
  client: any;
  actorProfileId: string;
  actorName: string;
  postId: string;
  commentId: string;
  body: string;
}) {
  const { hasAll, tokens } = extractMentionTokens(params.body);
  if (!hasAll && tokens.size === 0) return;

  const followers = await fetchFollowersForMentions(params.client, params.actorProfileId);
  if (!followers.length) return;

  const recipients = followers.filter((profile: MentionFollower) => {
    if (profile.id === params.actorProfileId) return false;
    if (hasAll) return true;
    const aliases = profileMentionAliases(profile);
    for (const token of tokens) {
      if (aliases.has(token)) return true;
    }
    return false;
  });

  if (!recipients.length) return;

  const deduped = Array.from(
    new Map<string, MentionFollower>(recipients.map((profile: MentionFollower) => [profile.id, profile])).values(),
  );
  const rows = deduped.map((profile) => ({
    user_id: profile.user_id,
    recipient_profile_id: profile.id,
    actor_profile_id: params.actorProfileId,
    kind: 'comment_mention',
    payload: {
      post_id: params.postId,
      comment_id: params.commentId,
      mention: hasAll ? 'all' : 'personal',
      actor_name: params.actorName,
      preview: toPushPreview(params.body),
    },
    read: false,
  }));

  const { error } = await params.client.from('notifications').insert(rows);
  if (error) {
    console.warn('[api/feed/comments][mentions] notification insert failed', { message: error.message });
  }
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

  try {
    await rateLimit(req, { key: `feed:comments:POST:${auth.user.id}`, limit: 30, window: '1m' });
  } catch (error: any) {
    return rateLimited('Too Many Requests', { retryAfter: error?.headers?.['Retry-After'] ?? null });
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
        if (GROUPED_PUSH_DEBOUNCE_ENABLED) {
          await enqueueGroupedPostPush({
            client: notificationsClient,
            recipientUserId,
            kind: 'new_comment',
            postId,
            actorName: actorName || 'Qualcuno',
            latestNotificationId: Number(insertedNotification.id),
            body: commentPreview,
          });
          console.info('[api/feed/comments][POST] grouped push queued', {
            postId,
            commentId: data.id,
            notificationId: insertedNotification.id,
            recipientUserId,
          });
        } else {
          const immediateSummary = await sendPushForNotificationBestEffort({
            supabase: notificationsClient,
            userId: recipientUserId,
            notificationId: String(insertedNotification.id),
            kind: 'new_comment',
            payload: notificationPayload.payload,
          });
          console.info('[api/feed/comments][POST] immediate push sent (debounce disabled)', {
            postId,
            commentId: data.id,
            notificationId: insertedNotification.id,
            recipientUserId,
            immediateSummary,
          });
        }
      }
    }

    if (actorProfileId) {
      await notifyMentionedFollowersInComment({
        client: notificationsClient,
        actorProfileId,
        actorName: actorName || 'Qualcuno',
        postId,
        commentId: String(data.id),
        body,
      });
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
