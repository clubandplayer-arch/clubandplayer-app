import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import {
  dbError,
  invalidPayload,
  notAuthenticated,
  notFoundResponse,
  successResponse,
  unknownError,
} from '@/lib/api/standardResponses';
import { withAuth } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

function extractProfileId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.profileId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

export const DELETE = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const profileId = extractProfileId(routeContext);
  const targetProfileId = typeof profileId === 'string' ? profileId.trim() : '';
  if (!targetProfileId) return invalidPayload('profileId mancante');

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] DELETE /api/direct-messages/conversation/:profileId missing profile', { userId: user.id });
      return notAuthenticated('Profilo non trovato');
    }

    const peer = await getProfileById(supabase, targetProfileId);
    if (!peer) {
      console.warn('[direct-messages] DELETE /api/direct-messages/conversation/:profileId target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId,
      });
      return notFoundResponse('Profilo target non trovato');
    }

    const now = new Date().toISOString();
    const { error: hideError } = await supabase
      .from('direct_message_hidden_threads')
      .upsert(
        {
          owner_profile_id: me.id,
          other_profile_id: peer.id,
          hidden_at: now,
          cleared_at: now,
        },
        { onConflict: 'owner_profile_id,other_profile_id' },
      );

    if (hideError) throw hideError;

    return successResponse({
      hiddenAt: now,
      clearedAt: now,
      targetProfileId: peer.id,
    });
  } catch (error: any) {
    console.error('[direct-messages] DELETE /api/direct-messages/conversation/:profileId unexpected error', {
      error,
      targetProfileId,
      userId: user.id,
    });
    Sentry.captureException(error);
    if (typeof error?.message === 'string') {
      return dbError(error.message);
    }
    return unknownError({ endpoint: 'direct-messages/conversation', error });
  }
});
