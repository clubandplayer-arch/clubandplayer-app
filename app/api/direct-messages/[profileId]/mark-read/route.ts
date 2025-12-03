import * as Sentry from '@sentry/nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

function isMissingReadStateTable(error: any) {
  return typeof error?.message === 'string'
    ? error.message.includes('direct_message_read_state') || error.message.includes('relation "direct_message_read_state"')
    : error?.code === '42P01';
}

function extractProfileId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.profileId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

export const POST = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return jsonError('profileId mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId/mark-read missing profile', {
        userId: user.id,
        targetProfileId: otherId,
      });
      return jsonError('profilo non trovato', 403);
    }

    console.log('[direct-messages] POST /api/direct-messages/:profileId/mark-read', {
      userId: user.id,
      profileId: me.id,
      targetProfileId: otherId,
    });

    const peer = await getProfileById(supabase, otherId);
    if (!peer) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId/mark-read target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId: otherId,
      });
      return jsonError('profilo target non trovato', 404);
    }

    const { error } = await supabase
      .from('direct_message_read_state')
      .upsert(
        {
          owner_profile_id: me.id,
          other_profile_id: peer.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'owner_profile_id,other_profile_id' },
      )
      .select('id')
      .maybeSingle();

    if (error) {
      if (isMissingReadStateTable(error)) {
        console.warn('[direct-messages] POST /api/direct-messages/:profileId/mark-read missing table direct_message_read_state, skipping');
        return NextResponse.json({ ok: true, warning: 'read_state_table_missing' });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, warning: null });
  } catch (error: any) {
    console.error('[direct-messages] POST /api/direct-messages/:profileId/mark-read unexpected error', {
      error,
      targetProfileId: otherId,
      userId: user.id,
    });
    Sentry.captureException(error);
    return jsonError('server_error', 500);
  }
});
