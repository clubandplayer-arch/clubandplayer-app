import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile } from '@/lib/api/profile';
import { notAuthenticated, successResponse, unknownError } from '@/lib/api/standardResponses';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req: NextRequest, { supabase, user }) => {
  try {
    const profile = await getActiveProfile(supabase, user.id);
    if (!profile) return notAuthenticated('Profilo non trovato');

    const lastSeenAt = new Date().toISOString();
    const { error } = await supabase.from('profile_presence').upsert(
      { profile_id: profile.id, last_seen_at: lastSeenAt },
      { onConflict: 'profile_id' },
    );
    if (error) throw error;

    return successResponse({ lastSeenAt });
  } catch (error) {
    console.error('[presence] heartbeat failed', { error, userId: user.id });
    Sentry.captureException(error);
    return unknownError({ endpoint: 'presence/heartbeat', error });
  }
});
