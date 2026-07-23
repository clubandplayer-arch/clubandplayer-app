import { withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { dbError, rateLimited, successResponse, unknownError } from '@/lib/api/standardResponses';
import { getPlayerFanVoteSummary } from '@/lib/notifications/fanVoteSummary';

export const runtime = 'nodejs';

const MESSAGE_NOTIFICATION_KINDS = ['new_message', 'message'] as const;
const UNREAD_COUNT_CACHE_TTL_MS = 5_000;
const unreadCountCache = new Map<string, { count: number; expiresAt: number }>();

export const GET = withAuth(async (req, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `notifications:unread-count:${user.id}`, limit: 120, window: '1m' });
  } catch {
    return rateLimited('Too Many Requests');
  }

  try {
    const now = Date.now();
    const cached = unreadCountCache.get(user.id);
    // Fan Vote summary is intentionally not cached because it can change outside notifications.
    if (cached && cached.expiresAt > now) {
      const fanVoteSummary = await getPlayerFanVoteSummary(supabase, user.id);
      return successResponse({ count: cached.count, serverCount: cached.count, fanVoteSummary, cached: true });
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('read_at.is.null,read.eq.false')
      .not('kind', 'in', `(${MESSAGE_NOTIFICATION_KINDS.map((kind) => `"${kind}"`).join(',')})`);

    if (error) return dbError(error.message);

    const serverCount = count || 0;
    const fanVoteSummary = await getPlayerFanVoteSummary(supabase, user.id);
    const safeCount = serverCount;
    unreadCountCache.set(user.id, {
      count: safeCount,
      expiresAt: now + UNREAD_COUNT_CACHE_TTL_MS,
    });

    return successResponse({ count: safeCount, serverCount, fanVoteSummary, cached: false });
  } catch (e: any) {
    return unknownError({ endpoint: 'notifications/unread-count', error: e, message: e?.message || 'Errore inatteso' });
  }
});
