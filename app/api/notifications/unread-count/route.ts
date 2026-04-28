import { withAuth } from '@/lib/api/auth';
import { dbError, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

const MESSAGE_NOTIFICATION_KINDS = ['new_message', 'message'] as const;

export const GET = withAuth(async (_req, { supabase, user }) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('read_at.is.null,read.eq.false')
      .not('kind', 'in', `(${MESSAGE_NOTIFICATION_KINDS.map((kind) => `"${kind}"`).join(',')})`);

    if (error) return dbError(error.message);

    return successResponse({ count: count || 0 });
  } catch (e: any) {
    return unknownError({ endpoint: 'notifications/unread-count', error: e, message: e?.message || 'Errore inatteso' });
  }
});
