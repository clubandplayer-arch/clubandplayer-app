import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAuth } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ProfileRow = {
  id: string;
  user_id?: string | null;
};

async function loadProfile(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Profilo non trovato');
  return data;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;

  const supabase = auth.ctx.supabase;
  const user = auth.ctx.user;
  const targetId = req.nextUrl.searchParams.get('to')?.trim();

  if (!targetId) return jsonError('Parametro "to" mancante', 400);

  try {
    const me = await loadProfile(supabase, user.id);
    if (targetId === me.id) return jsonError('Non puoi avviare una chat con te stesso', 400);

    const { data: target, error: targetErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', targetId)
      .maybeSingle();

    if (targetErr) return jsonError(targetErr.message, 400);
    if (!target?.id) return jsonError('Profilo destinatario non trovato', 404);

    const { data: existing, error: existingErr } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_a.eq.${me.id},participant_b.eq.${target.id}),and(participant_a.eq.${target.id},participant_b.eq.${me.id})`)
      .maybeSingle();

    if (existingErr) return jsonError(existingErr.message, 400);

    let conversationId = existing?.id as string | undefined;

    if (!conversationId) {
      const { data: created, error: insertErr } = await supabase
        .from('conversations')
        .insert({ participant_a: me.id, participant_b: target.id })
        .select('id')
        .maybeSingle();

      if (insertErr) {
        console.error('API /messages/start insert error', { user: me.id, target: target.id, error: insertErr });
        return jsonError(insertErr.message, 400);
      }
      conversationId = created?.id as string;
    }

    return NextResponse.json({ ok: true, conversationId });
  } catch (e: any) {
    console.error('API /messages/start unexpected', e);
    return jsonError(e.message || 'Errore inatteso', 400);
  }
}
