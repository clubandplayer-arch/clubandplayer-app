import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const conversationId = (routeContext?.params as any)?.id;
  const id = typeof conversationId === 'string' ? conversationId : Array.isArray(conversationId) ? conversationId[0] : null;
  if (!id) return jsonError('conversationId mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const { data: participation, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', id)
      .eq('profile_id', me.id)
      .maybeSingle();
    if (partError) throw partError;
    if (!participation) return jsonError('non autorizzato', 403);

    const { data: rows, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_profile_id, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (messagesError) throw messagesError;

    return NextResponse.json({ messages: rows || [] });
  } catch (error: any) {
    console.error('[api/conversations/:id/messages GET] errore', { error, conversationId: id });
    return jsonError('server_error', 500);
  }
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const conversationId = (routeContext?.params as any)?.id;
  const id = typeof conversationId === 'string' ? conversationId : Array.isArray(conversationId) ? conversationId[0] : null;
  if (!id) return jsonError('conversationId mancante', 400);

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body?.content || '').trim();
  if (!content) return jsonError('contenuto mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const { data: participation, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', id)
      .eq('profile_id', me.id)
      .maybeSingle();
    if (partError) throw partError;
    if (!participation) return jsonError('non autorizzato', 403);

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_profile_id: me.id,
        content,
      })
      .select('id, conversation_id, sender_profile_id, content, created_at')
      .maybeSingle();
    if (insertError) throw insertError;

    await supabase
      .from('conversations')
      .update({
        last_message_at: inserted?.created_at ?? new Date().toISOString(),
        last_message_preview: inserted?.content ?? content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ message: inserted });
  } catch (error: any) {
    console.error('[api/conversations/:id/messages POST] errore', { error, conversationId: id });
    return jsonError('server_error', 500);
  }
});
