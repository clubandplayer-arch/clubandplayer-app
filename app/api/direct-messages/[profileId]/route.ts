import * as Sentry from '@sentry/nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getActiveProfile, getProfileById } from '@/lib/api/profile';

export const runtime = 'nodejs';

function extractProfileId(routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }) {
  const raw = (routeContext?.params as any)?.profileId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return null;
}

export const GET = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return jsonError('profileId mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] GET /api/direct-messages/:profileId missing profile', { userId: user.id, targetProfileId });
      return jsonError('profilo non trovato', 403);
    }

    console.log('[direct-messages] GET /api/direct-messages/:profileId', {
      userId: user.id,
      profileId: me.id,
      targetProfileId: otherId,
    });

    const peer = await getProfileById(supabase, otherId);
    if (!peer) {
      console.warn('[direct-messages] GET /api/direct-messages/:profileId target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId: otherId,
      });
      return jsonError('profilo target non trovato', 404);
    }

    const { data: rows, error } = await supabase
      .from('direct_messages')
      .select('id, sender_profile_id, recipient_profile_id, content, created_at')
      .or(
        `and(sender_profile_id.eq.${me.id},recipient_profile_id.eq.${peer.id}),and(sender_profile_id.eq.${peer.id},recipient_profile_id.eq.${me.id})`,
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      messages: rows || [],
      peer: {
        id: peer.id,
        display_name: peer.display_name,
        account_type: peer.account_type,
        avatar_url: peer.avatar_url,
      },
      currentProfileId: me.id,
    });
  } catch (error: any) {
    console.error('[direct-messages] GET /api/direct-messages/:profileId unexpected error', {
      error,
      targetProfileId: otherId,
      userId: user.id,
    });
    Sentry.captureException(error);
    return jsonError('server_error', 500);
  }
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return jsonError('profileId mancante', 400);

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body?.content || '').trim();
  if (!content) {
    console.warn('[direct-messages] POST /api/direct-messages/:profileId validation error', {
      userId: user.id,
      targetProfileId: otherId,
      reason: 'contenuto mancante',
    });
    return jsonError('contenuto mancante', 400);
  }

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId missing profile', { userId: user.id });
      return jsonError('profilo non trovato', 403);
    }

    console.log('[direct-messages] POST /api/direct-messages/:profileId', {
      userId: user.id,
      profileId: me.id,
      targetProfileId: otherId,
      messageLength: content.length,
    });

    const peer = await getProfileById(supabase, otherId);
    if (!peer) {
      console.warn('[direct-messages] POST /api/direct-messages/:profileId target not found', {
        userId: user.id,
        profileId: me.id,
        targetProfileId: otherId,
      });
      return jsonError('profilo target non trovato', 404);
    }

    const { data: inserted, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_profile_id: me.id,
        recipient_profile_id: peer.id,
        content,
      })
      .select('id, sender_profile_id, recipient_profile_id, content, created_at')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ message: inserted });
  } catch (error: any) {
    console.error('[direct-messages] POST /api/direct-messages/:profileId unexpected error', {
      error,
      targetProfileId: otherId,
      userId: user.id,
    });
    Sentry.captureException(error);
    return jsonError('server_error', 500);
  }
});
