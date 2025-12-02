import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const { data: incoming, error: incomingError } = await supabase
      .from('direct_messages')
      .select('sender_profile_id, recipient_profile_id, created_at')
      .eq('recipient_profile_id', me.id)
      .order('created_at', { ascending: false });

    if (incomingError) throw incomingError;

    const { data: readStates, error: readError } = await supabase
      .from('direct_message_read_state')
      .select('other_profile_id, last_read_at')
      .eq('owner_profile_id', me.id);

    if (readError) throw readError;

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

    return NextResponse.json({ unreadThreads });
  } catch (error: any) {
    console.error('[api/direct-messages/unread-count GET] errore', { error });
    return jsonError('server_error', 500);
  }
});
