import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

// Restituisce solo gli ID dei profili seguiti dall'utente corrente
export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes?.user) {
    return NextResponse.json({ data: [] });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('user_id', userRes.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[api/follows] errore profilo', profileError);
    return jsonError('Errore profilo', 400);
  }

  if (!profile?.id || profile.status !== 'active') {
    return NextResponse.json({ data: [] });
  }

  const { data: follows, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('follower_id', profile.id)
    .limit(400);

  if (error) {
    console.error('[api/follows] errore lettura follows', error);
    return jsonError('Errore nel recupero dei follow', 400);
  }

  const ids = (follows || [])
    .map((row) => row?.target_id)
    .filter(Boolean) as string[];

  return NextResponse.json({ data: ids });
}
