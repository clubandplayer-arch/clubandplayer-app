import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
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

export const GET = withAuth(async (_req, { supabase, user }) => {
  try {
    const me = await loadProfile(supabase, user.id);

    const { data, error } = await supabase
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, last_message_preview, created_at, updated_at')
      .or(`participant_a.eq.${me.id},participant_b.eq.${me.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (error) return jsonError(error.message, 400);

    const ids = new Set<string>();
    (data ?? []).forEach((row) => {
      if (row.participant_a) ids.add(row.participant_a);
      if (row.participant_b) ids.add(row.participant_b);
    });

    const { data: profiles } = ids.size
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, account_type, city, country')
          .in('id', Array.from(ids))
      : { data: [] as any[] };

    const map = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

    const conversations = (data ?? []).map((row) => {
      const peerId = row.participant_a === me.id ? row.participant_b : row.participant_a;
      return { ...row, peer: peerId ? map[peerId] ?? null : null };
    });

    return NextResponse.json({ data: conversations, me });
  } catch (e: any) {
    return jsonError(e.message || 'Errore inatteso', 400);
  }
});

export const POST = withAuth(async (req, { supabase, user }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const targetProfileId = typeof body.targetProfileId === 'string' ? body.targetProfileId.trim() : '';
    const initialMessage = typeof body.message === 'string' ? body.message.trim() : '';

    if (!targetProfileId) return jsonError('targetProfileId mancante', 400);

    const me = await loadProfile(supabase, user.id);
    if (targetProfileId === me.id) return jsonError('Non puoi avviare una chat con te stesso', 400);

    const { data: target, error: targetErr } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', targetProfileId)
      .maybeSingle();

    if (targetErr) return jsonError(targetErr.message, 400);
    if (!target?.id) return jsonError('Profilo destinatario non trovato', 404);

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_a.eq.${me.id},participant_b.eq.${target.id}),and(participant_a.eq.${target.id},participant_b.eq.${me.id})`
      )
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;

    if (!conversationId) {
      const { data: inserted, error: insertErr } = await supabase
        .from('conversations')
        .insert({
          created_by: me.id,
          participant_a: me.id,
          participant_b: target.id,
        })
        .select('id')
        .maybeSingle();

      if (insertErr) return jsonError(insertErr.message, 400);
      conversationId = inserted?.id as string;

      await supabase
        .from('conversation_participants')
        .upsert(
          [
            { conversation_id: conversationId, user_id: user.id, profile_id: me.id },
            target.user_id ? { conversation_id: conversationId, user_id: target.user_id, profile_id: target.id } : null,
          ].filter(Boolean) as any[],
          { onConflict: 'conversation_id,user_id' }
        );
    }

    if (initialMessage) {
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_profile_id: me.id,
        body: initialMessage,
      });
      if (msgErr) return jsonError(msgErr.message, 400);
    }

    return NextResponse.json({ data: { conversationId } });
  } catch (e: any) {
    return jsonError(e.message || 'Errore inatteso', 400);
  }
});
