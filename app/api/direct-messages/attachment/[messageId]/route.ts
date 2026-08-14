import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { invalidPayload, notAuthenticated, notAuthorized, notFoundResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const raw = (routeContext?.params as any)?.messageId;
  const messageId = typeof raw === 'string' ? raw.trim() : '';
  if (!messageId) return invalidPayload('messageId mancante');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return notAuthenticated('Profilo non trovato');

    const { data: message, error } = await supabase
      .from('direct_messages')
      .select('sender_profile_id, recipient_profile_id, attachment_path, deleted_at')
      .eq('id', messageId)
      .maybeSingle();
    if (error) throw error;
    if (!message || message.deleted_at || !message.attachment_path) return notFoundResponse('Foto non trovata');
    if (message.sender_profile_id !== me.id && message.recipient_profile_id !== me.id) {
      return notAuthorized('Non puoi visualizzare questa foto');
    }

    const admin = getSupabaseAdminClientOrNull();
    if (!admin) throw new Error('Storage non configurato');
    const { data, error: signedError } = await admin.storage
      .from('direct-message-images')
      .createSignedUrl(message.attachment_path as string, 60 * 10);
    if (signedError || !data?.signedUrl) throw signedError || new Error('Foto non disponibile');
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return unknownError({ endpoint: 'direct-messages/attachment', error });
  }
});
