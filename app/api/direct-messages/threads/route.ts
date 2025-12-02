import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const { data, error } = await supabase
      .from('direct_messages')
      .select(
        `id, sender_profile_id, recipient_profile_id, content, created_at,
         sender:sender_profile_id ( id, display_name, avatar_url, account_type, status ),
         recipient:recipient_profile_id ( id, display_name, avatar_url, account_type, status )`
      )
      .or(`sender_profile_id.eq.${me.id},recipient_profile_id.eq.${me.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

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

    for (const row of data ?? []) {
      const senderId = row.sender_profile_id as string;
      const recipientId = row.recipient_profile_id as string;
      const otherId = senderId === me.id ? recipientId : senderId;

      if (!otherId) continue;

      const otherProfile = senderId === me.id ? (row as any).recipient : (row as any).sender;
      if (!otherProfile?.id || otherProfile.status !== 'active') continue;

      if (!threadsMap.has(otherId)) {
        threadsMap.set(otherId, {
          otherProfileId: otherProfile.id,
          otherName: otherProfile.display_name || 'Profilo',
          otherAvatarUrl: otherProfile.avatar_url || null,
          lastMessage: row.content as string,
          lastMessageAt: row.created_at as string,
          lastIncomingAt: row.recipient_profile_id === me.id ? (row.created_at as string) : null,
        });
        continue;
      }

      const thread = threadsMap.get(otherId)!;
      if (!thread.lastIncomingAt && row.recipient_profile_id === me.id) {
        thread.lastIncomingAt = row.created_at as string;
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

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error('[api/direct-messages/threads GET] errore', { error });
    return jsonError('server_error', 500);
  }
});
