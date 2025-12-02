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

export const POST = withAuth(async (_req: NextRequest, { supabase, user }, routeContext) => {
  const targetProfileId = extractProfileId(routeContext);
  const otherId = typeof targetProfileId === 'string' ? targetProfileId.trim() : '';
  if (!otherId) return jsonError('profileId mancante', 400);

  try {
    const me = await getActiveProfile(supabase, user.id);
    if (!me) return jsonError('profilo non trovato', 403);

    const peer = await getProfileById(supabase, otherId);
    if (!peer) return jsonError('profilo target non trovato', 404);

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

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[api/direct-messages/mark-read POST] errore', { error, targetProfileId: otherId });
    return jsonError('server_error', 500);
  }
});
