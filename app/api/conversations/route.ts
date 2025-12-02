import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const { data: participation, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', me.id);
    if (partError) throw partError;

    const conversationIds = (participation || []).map((row) => (row as any).conversation_id).filter(Boolean);
    if (!conversationIds.length) {
      return NextResponse.json({ conversations: [], currentProfileId: me.id });
    }

    const { data: conversationRows, error: convError } = await supabase
      .from('conversations')
      .select('id, created_at, last_message_at, last_message_preview')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });
    if (convError) throw convError;

    const { data: participantRows, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, profile:profiles(id, display_name, account_type, avatar_url)')
      .in('conversation_id', conversationIds);
    if (participantsError) throw participantsError;

    const peersMap = new Map<string, any>();
    participantRows?.forEach((row) => {
      const convId = (row as any)?.conversation_id;
      const profile = (row as any)?.profile;
      if (!convId || !profile?.id) return;
      if (profile.id === me.id) return;
      peersMap.set(convId, profile);
    });

    const conversations = (conversationRows || []).map((row) => ({
      id: row.id as string,
      peer: peersMap.get(row.id) || null,
      last_message_at: row.last_message_at || row?.created_at || null,
      last_message_preview: row.last_message_preview || null,
    }));

    return NextResponse.json({ conversations, currentProfileId: me.id });
  } catch (error: any) {
    console.error('[api/conversations] errore', { error });
    return jsonError('server_error', 500);
  }
});
