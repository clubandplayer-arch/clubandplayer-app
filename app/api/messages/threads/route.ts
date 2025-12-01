import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  city: string | null;
  country: string | null;
  user_id?: string | null;
};

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

    if (error) {
      console.error('API /messages/threads list error', { user: me.id, error });
      return jsonError(error.message, 400);
    }

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
    console.error('API /messages/threads unexpected', e);
    return jsonError(e.message || 'Errore inatteso', 400);
  }
});
