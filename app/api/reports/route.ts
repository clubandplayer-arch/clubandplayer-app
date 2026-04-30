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

  const body = await req.json().catch(() => null);
  const targetType = typeof body?.targetType === 'string' ? body.targetType : '';
  const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

  if (!['post', 'comment', 'profile'].includes(targetType) || !targetId) {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const profile = await getActiveProfile(supabase, user.id);

  const { error } = await supabase.from('ugc_reports').insert({
    reporter_user_id: user.id,
    reporter_profile_id: profile?.id ?? null,
    target_type: targetType,
    target_id: targetId,
    reason: reason || null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
