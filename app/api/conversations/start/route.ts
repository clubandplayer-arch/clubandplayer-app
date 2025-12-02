import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const body = (await req.json().catch(() => ({}))) as { targetProfileId?: string };
  const targetProfileId = (body?.targetProfileId || '').trim();
  if (!targetProfileId) return jsonError('targetProfileId mancante', 400);

  try {
    const myProfile = await getActiveProfile(supabase, user.id);
    if (!myProfile) return jsonError('profilo non trovato', 403);

    const targetProfile = await getProfileById(supabase, targetProfileId);
    if (!targetProfile) return jsonError('profilo target non trovato', 404);

    // Cerca una conversazione esistente con entrambi i profili
    const [{ data: mine, error: mineError }, { data: theirs, error: theirsError }] = await Promise.all([
      supabase.from('conversation_participants').select('conversation_id').eq('profile_id', myProfile.id),
      supabase.from('conversation_participants').select('conversation_id').eq('profile_id', targetProfile.id),
    ]);
    if (mineError || theirsError) throw mineError || theirsError;

    const mineIds = new Set((mine || []).map((row) => (row as any)?.conversation_id).filter(Boolean));
    const conversationId = (theirs || [])
      .map((row) => (row as any)?.conversation_id)
      .find((id) => id && mineIds.has(id as string)) as string | undefined;

    let activeConversationId = conversationId;

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .maybeSingle();
      if (createError) throw createError;
      activeConversationId = created?.id as string;

      // Inserisci i partecipanti (prima l'utente corrente, poi il target)
      const inserts = [myProfile.id, targetProfile.id].map((pid) => ({
        conversation_id: activeConversationId,
        profile_id: pid,
      }));
      const { error: partError } = await supabase.from('conversation_participants').upsert(inserts);
      if (partError) throw partError;
    }

    return NextResponse.json({
      ok: true,
      conversationId: activeConversationId,
      peer: {
        id: targetProfile.id,
        display_name: targetProfile.display_name,
        account_type: targetProfile.account_type,
        avatar_url: targetProfile.avatar_url,
      },
      currentProfileId: myProfile.id,
    });
  } catch (error: any) {
    console.error('[api/conversations/start] errore', { error });
    return jsonError('server_error', 500);
  }
});
