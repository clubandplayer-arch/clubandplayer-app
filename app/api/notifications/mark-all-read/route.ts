import { withAuth } from '@/lib/api/auth';
import { dbError, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req, { supabase, user }) => {
  try {
    const { error, count } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), read: true }, { count: 'exact' })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) return dbError(error.message);

    return successResponse({ success: true, updated: count || 0 });
  } catch (e: any) {
    return unknownError({ endpoint: 'notifications/mark-all-read', error: e, message: e?.message || 'Errore inatteso' });
  }
});
