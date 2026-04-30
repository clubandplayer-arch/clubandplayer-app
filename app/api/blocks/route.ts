import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/api/profile';

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile?.id) {
    return Response.json({ error: 'profile_not_found' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const blockedProfileId = typeof body?.blockedProfileId === 'string' ? body.blockedProfileId.trim() : '';

  if (!blockedProfileId) {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (blockedProfileId === profile.id) {
    return Response.json({ error: 'cannot_block_self' }, { status: 400 });
  }

  const { error } = await supabase.from('profile_blocks').insert({
    blocker_profile_id: profile.id,
    blocked_profile_id: blockedProfileId,
  });

  if (error && error.code !== '23505') {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
