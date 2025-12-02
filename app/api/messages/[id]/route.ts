import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAuth } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  city: string | null;
  country: string | null;
  user_id?: string | null;
};

type ParticipantRow = {
  user_id: string;
  profile_id?: string | null;
};

export const runtime = 'nodejs';

async function loadProfile(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, account_type, city, country, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Profilo non trovato');
  return data;
}

async function ensureParticipants(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  conversationId: string,
  participants: ParticipantRow[]
) {
  const rows = participants
    .filter((p) => p.user_id)
    .map((p) => ({
      conversation_id: conversationId,
      user_id: p.user_id,
      profile_id: p.profile_id ?? null,
    }));

  if (!rows.length) return;

  const { error } = await supabase
    .from('conversation_participants')
    .upsert(rows, { onConflict: 'conversation_id,user_id' });

  if (error) {
    console.error('[api-messages-send] upsert participants error', {
      conversationId,
      error,
    });
    throw new Error(error.message);
  }
}

async function handleGet(conversationId: string, supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, userId: string) {
  const me = await loadProfile(supabase, userId);
  try {
    await ensureParticipants(supabase, conversationId, [{ user_id: userId, profile_id: me.id }]);
  } catch (participantErr: any) {
    console.error('[api-messages-load] ensure participants failed', {
      conversationId,
      userId,
      profileId: me.id,
      error: participantErr,
    });
    return jsonError('Accesso alla conversazione non disponibile', 400);
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b, last_message_at, last_message_preview, created_at, updated_at')
    .eq('id', conversationId)
    .or(`participant_a.eq.${me.id},participant_b.eq.${me.id}`)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!conversation?.id) return jsonError('Conversazione non trovata', 404);

  const peerId = conversation.participant_a === me.id ? conversation.participant_b : conversation.participant_a;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, account_type, city, country')
    .in('id', [conversation.participant_a, conversation.participant_b].filter(Boolean) as string[]);

  const map = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  const peer = peerId ? map[peerId] ?? null : null;

  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, sender_profile_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgErr) return jsonError(msgErr.message, 400);

  console.log('[messaging-api] load conversation', {
    conversationId,
    messages: messages?.length ?? 0,
  });

  return NextResponse.json({ ok: true, conversation: { ...conversation, peer }, peer, me, messages: messages ?? [] });
}

async function handlePost(
  conversationId: string,
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
  body: Record<string, unknown>
) {
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return jsonError('Messaggio vuoto', 400);

  const me = await loadProfile(supabase, userId);

  console.log('[api-messages-send] incoming', {
    conversationId,
    senderUserId: userId,
    senderProfileId: me.id,
    bodyLength: text.length,
  });

  try {
    await ensureParticipants(supabase, conversationId, [{ user_id: userId, profile_id: me.id }]);
  } catch (participantErr: any) {
    console.error('[api-messages-send] ensure participants failed', {
      conversationId,
      senderProfileId: me.id,
      error: participantErr,
    });
    return jsonError('Impossibile registrare i partecipanti', 400);
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .or(`participant_a.eq.${me.id},participant_b.eq.${me.id}`)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!conversation?.id) return jsonError('Conversazione non trovata', 404);

  const { data: inserted, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: me.user_id ?? userId,
      sender_profile_id: me.id,
      body: text,
    })
    .select('id, conversation_id, sender_profile_id, sender_id, body, created_at')
    .maybeSingle();

  if (msgErr) {
    console.error('[api-messages-send] insert error', {
      conversationId,
      sender: me.id,
      error: msgErr,
    });
    return jsonError(msgErr.message, 400);
  }

  console.log('[api-messages-send] insert success', {
    conversationId,
    messageId: inserted?.id,
  });

  const lastPreview = text.slice(0, 200);
  const lastAt = inserted?.created_at || new Date().toISOString();

  const { error: convUpdateErr } = await supabase
    .from('conversations')
    .update({ last_message_at: lastAt, last_message_preview: lastPreview })
    .eq('id', conversationId);

  if (convUpdateErr) {
    console.error('API /messages/:id conversation update error', { conversationId, error: convUpdateErr });
  }

  return NextResponse.json({ ok: true, message: inserted ?? null });
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { id } = await context.params;
  return handleGet(id, auth.ctx.supabase, auth.ctx.user.id);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { id } = await context.params;
  const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return handlePost(id, auth.ctx.supabase, auth.ctx.user.id, payload);
}
