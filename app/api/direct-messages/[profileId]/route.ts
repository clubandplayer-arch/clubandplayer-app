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
    if (!me) return jsonError('profilo non trovato', 403);

    const peer = await getProfileById(supabase, otherId);
    if (!peer) return jsonError('profilo target non trovato', 404);

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
    console.error('[api/direct-messages/:profileId GET] errore', { error, targetProfileId: otherId });
    return jsonError('server_error', 500);
  }
});

export const POST = withAuth(async (req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return jsonError('profileId mancante', 400);

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = (body?.content || '').trim();
  if (!content) return jsonError('contenuto mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const peer = await getProfileById(supabase, otherId);
    if (!peer) return jsonError('profilo target non trovato', 404);

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
    console.error('[api/direct-messages/:profileId POST] errore', { error, targetProfileId: otherId });
    return jsonError('server_error', 500);
  }
});
