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

async function handleGet(conversationId: string, supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, userId: string) {
  const me = await loadProfile(supabase, userId);

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
    .order('created_at', { ascending: true })
    .limit(200);

  if (msgErr) return jsonError(msgErr.message, 400);

  return NextResponse.json({ conversation: { ...conversation, peer }, peer, me, messages: messages ?? [] });
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

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .or(`participant_a.eq.${me.id},participant_b.eq.${me.id}`)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!conversation?.id) return jsonError('Conversazione non trovata', 404);

  const { error: msgErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: me.user_id ?? userId,
    sender_profile_id: me.id,
    body: text,
  });

  if (msgErr) return jsonError(msgErr.message, 400);

  return NextResponse.json({ ok: true });
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
