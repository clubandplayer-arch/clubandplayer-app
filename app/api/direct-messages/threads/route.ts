import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { dbError, notAuthenticated, successResponse, unknownError } from '@/lib/api/standardResponses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

function isMissingReadStateTable(error: any) {
  return typeof error?.message === 'string'
    ? error.message.includes('direct_message_read_state') || error.message.includes('relation "direct_message_read_state"')
    : error?.code === '42P01';
}

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] GET /api/direct-messages/threads missing profile', { userId: user.id });
      return notAuthenticated('Profilo non trovato');
    }

    console.log('[direct-messages] GET /api/direct-messages/threads', { userId: user.id, profileId: me.id });

    const { data: messages, error: messagesError } = await supabase
      .from('direct_messages')
      .select('sender_profile_id, recipient_profile_id, content, created_at')
      .or(`sender_profile_id.eq.${me.id},recipient_profile_id.eq.${me.id}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    const otherIds = new Set<string>();
    for (const row of messages ?? []) {
      const senderId = row.sender_profile_id as string | null;
      const recipientId = row.recipient_profile_id as string | null;
      const otherId = senderId === me.id ? recipientId : senderId;
      if (otherId) otherIds.add(otherId);
    }

    const otherProfiles = new Map<
      string,
      { id: string; display_name: string | null; avatar_url: string | null; status: string | null }
    >();

    if (otherIds.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, status')
        .in('id', Array.from(otherIds));

      if (profilesError) throw profilesError;
      for (const p of profiles ?? []) {
        if (p.id) {
          otherProfiles.set(p.id as string, {
            id: p.id as string,
            display_name: (p as any).display_name ?? null,
            avatar_url: (p as any).avatar_url ?? null,
            status: (p as any).status ?? null,
          });
        }
      }
    }

    let readStates: { other_profile_id: string | null; last_read_at: string | null }[] = [];
    const { data: fetchedReadStates, error: readError } = await supabase
      .from('direct_message_read_state')
      .select('other_profile_id, last_read_at')
      .eq('owner_profile_id', me.id);

    if (readError) {
      if (isMissingReadStateTable(readError)) {
        console.warn('[direct-messages] GET /api/direct-messages/threads missing table direct_message_read_state, treating all as read');
      } else {
        throw readError;
      }
    } else {
      readStates = fetchedReadStates ?? [];
    }

    const readMap = new Map<string, string>();
    for (const row of readStates ?? []) {
      if (row.other_profile_id) {
        readMap.set(row.other_profile_id as string, row.last_read_at as string);
      }
    }

    const threadsMap = new Map<
      string,
      {
        otherProfileId: string;
        otherName: string;
        otherAvatarUrl: string | null;
        lastMessage: string;
        lastMessageAt: string;
        lastIncomingAt: string | null;
      }
    >();

    for (const row of messages ?? []) {
      const senderId = row.sender_profile_id as string;
      const recipientId = row.recipient_profile_id as string;
      const otherId = senderId === me.id ? recipientId : senderId;
      if (!otherId) continue;

      const profile = otherProfiles.get(otherId);
      if (!profile || profile.status !== 'active') continue;

      if (!threadsMap.has(otherId)) {
        threadsMap.set(otherId, {
          otherProfileId: profile.id,
          otherName: profile.display_name || 'Profilo',
          otherAvatarUrl: profile.avatar_url || null,
          lastMessage: row.content as string,
          lastMessageAt: row.created_at as string,
          lastIncomingAt: row.recipient_profile_id === me.id ? (row.created_at as string) : null,
        });
      } else {
        const thread = threadsMap.get(otherId)!;
        if (row.recipient_profile_id === me.id) {
          const currentIncoming = thread.lastIncomingAt ? new Date(thread.lastIncomingAt).getTime() : 0;
          const candidate = new Date(row.created_at as string).getTime();
          if (candidate > currentIncoming) {
            thread.lastIncomingAt = row.created_at as string;
          }
        }
      }
    }

    const threads = Array.from(threadsMap.values()).map((thread) => {
      const lastRead = thread.otherProfileId ? readMap.get(thread.otherProfileId) : undefined;
      const hasUnread =
        !!thread.lastIncomingAt && (!lastRead || new Date(thread.lastIncomingAt).getTime() > new Date(lastRead).getTime());

      return {
        otherProfileId: thread.otherProfileId,
        otherName: thread.otherName,
        otherAvatarUrl: thread.otherAvatarUrl,
        lastMessage: thread.lastMessage,
        lastMessageAt: thread.lastMessageAt,
        hasUnread,
      };
    });

    console.info('[direct-messages] GET /api/direct-messages/threads summary', {
      profile: me.id,
      messageCount: messages?.length ?? 0,
      threadCount: threads.length,
    });

    return successResponse({ threads });
  } catch (error: any) {
    console.error('[direct-messages] GET /api/direct-messages/threads unexpected error', { error, userId: user.id });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/threads', error });
  }
});
