import * as Sentry from '@sentry/nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
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
      console.warn('[direct-messages] GET /api/direct-messages/unread-count missing profile', { userId: user.id });
      return jsonError('profilo non trovato', 403);
    }

    console.log('[direct-messages] GET /api/direct-messages/unread-count', { userId: user.id, profileId: me.id });

    const { data: incoming, error: incomingError } = await supabase
      .from('direct_messages')
      .select('sender_profile_id, recipient_profile_id, created_at')
      .eq('recipient_profile_id', me.id)
      .order('created_at', { ascending: false });

    if (incomingError) throw incomingError;

    let readStates: { other_profile_id: string | null; last_read_at: string | null }[] = [];
    const { data: fetchedReadStates, error: readError } = await supabase
      .from('direct_message_read_state')
      .select('other_profile_id, last_read_at')
      .eq('owner_profile_id', me.id);

    if (readError) {
      if (isMissingReadStateTable(readError)) {
        console.warn('[direct-messages] GET /api/direct-messages/unread-count missing table direct_message_read_state, returning 0');
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

    const latestIncomingBySender = new Map<string, string>();
    for (const row of incoming ?? []) {
      const senderId = row.sender_profile_id as string;
      if (!senderId || latestIncomingBySender.has(senderId)) continue;
      latestIncomingBySender.set(senderId, row.created_at as string);
    }

    let unreadThreads = 0;
    for (const [senderId, lastIncomingAt] of latestIncomingBySender.entries()) {
      const lastReadAt = readMap.get(senderId);
      if (!lastReadAt || new Date(lastIncomingAt).getTime() > new Date(lastReadAt).getTime()) {
        unreadThreads += 1;
      }
    }

    console.info('[direct-messages] GET /api/direct-messages/unread-count summary', {
      profile: me.id,
      unreadThreads,
    });

    return NextResponse.json({ unreadThreads });
  } catch (error: any) {
    console.error('[direct-messages] GET /api/direct-messages/unread-count unexpected error', { error, userId: user.id });
    Sentry.captureException(error);
    const message = typeof error?.message === 'string' ? error.message : 'server_error';
    return jsonError(message, 500);
  }
});
