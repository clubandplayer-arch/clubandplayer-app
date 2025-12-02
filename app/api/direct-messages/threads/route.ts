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

    const threads: Array<{
      otherProfileId: string;
      otherName: string;
      otherAvatarUrl: string | null;
      lastMessage: string;
      lastMessageAt: string;
    }> = [];
    const seen = new Set<string>();

    for (const row of data ?? []) {
      const senderId = row.sender_profile_id as string;
      const recipientId = row.recipient_profile_id as string;
      const otherId = senderId === me.id ? recipientId : senderId;

      if (!otherId || seen.has(otherId)) continue;

      const otherProfile = senderId === me.id ? (row as any).recipient : (row as any).sender;
      if (!otherProfile?.id || otherProfile.status !== 'active') continue;

      threads.push({
        otherProfileId: otherProfile.id,
        otherName: otherProfile.display_name || 'Profilo',
        otherAvatarUrl: otherProfile.avatar_url || null,
        lastMessage: row.content as string,
        lastMessageAt: row.created_at as string,
      });
      seen.add(otherId);
    }

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error('[api/direct-messages/threads GET] errore', { error });
    return jsonError('server_error', 500);
  }
});
