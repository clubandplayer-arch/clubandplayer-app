import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';
import { invalidPayload, notAuthenticated, notAuthorized, notFoundResponse, successResponse, unknownError } from '@/lib/api/standardResponses';

const ALLOWED_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🙏']);

function messageIdFrom(context?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (context?.params as any)?.messageId;
  return typeof raw === 'string' ? raw.trim() : '';
}

export const POST = withAuth(async (req: NextRequest, { supabase, user }, context) => {
  const messageId = messageIdFrom(context);
  const { emoji } = await req.json().catch(() => ({ emoji: '' }));
  if (!messageId || !ALLOWED_REACTIONS.has(emoji)) return invalidPayload('Reazione non valida');
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthenticated();
    const { data: message, error: messageError } = await supabase.from('direct_messages')
      .select('id, sender_profile_id, recipient_profile_id, deleted_at').eq('id', messageId).maybeSingle();
    if (messageError) throw messageError;
    if (!message || message.deleted_at) return notFoundResponse('Messaggio non trovato');
    if (message.sender_profile_id !== me.id && message.recipient_profile_id !== me.id) return notAuthorized();
    const { data, error } = await supabase.from('direct_message_reactions').upsert(
      { message_id: messageId, profile_id: me.id, emoji }, { onConflict: 'message_id,profile_id' },
    ).select('id, message_id, profile_id, emoji, created_at').single();
    if (error) throw error;
    return successResponse({ reaction: data });
  } catch (error) { return unknownError({ endpoint: 'direct-messages/reaction', error }); }
});

export const DELETE = withAuth(async (_req: NextRequest, { supabase, user }, context) => {
  const messageId = messageIdFrom(context);
  if (!messageId) return invalidPayload('messageId mancante');
  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthenticated();
    const { error } = await supabase.from('direct_message_reactions').delete()
      .eq('message_id', messageId).eq('profile_id', me.id);
    if (error) throw error;
    return successResponse({ messageId });
  } catch (error) { return unknownError({ endpoint: 'direct-messages/reaction', error }); }
});
