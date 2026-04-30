import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/api/profile';

async function getCurrentProfile() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null as any };

  const profile = await getActiveProfile(supabase, user.id);
  return { supabase, user, profile };
}

export async function GET() {
  const { supabase, user, profile } = await getCurrentProfile();
  if (!user) return Response.json({ error: 'not_authenticated' }, { status: 401 });
  if (!profile?.id) return Response.json({ error: 'profile_not_found' }, { status: 400 });

  const { data, error } = await supabase
    .from('profile_blocks')
    .select('blocked_profile_id, profiles:blocked_profile_id(id, display_name, full_name, avatar_url, account_type)')
    .eq('blocker_profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const items = (data ?? []).map((row: any) => {
    const p = row?.profiles ?? null;
    return {
      blocked_profile_id: String(row.blocked_profile_id),
      display_name: p?.display_name ?? null,
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      account_type: p?.account_type ?? null,
    };
  });

  return Response.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

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

export async function DELETE(req: NextRequest) {
  const { supabase, user, profile } = await getCurrentProfile();
  if (!user) return Response.json({ error: 'not_authenticated' }, { status: 401 });
  if (!profile?.id) return Response.json({ error: 'profile_not_found' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const blockedProfileId = typeof body?.blockedProfileId === 'string' ? body.blockedProfileId.trim() : '';
  if (!blockedProfileId) return Response.json({ error: 'invalid_payload' }, { status: 400 });

  const { error } = await supabase
    .from('profile_blocks')
    .delete()
    .eq('blocker_profile_id', profile.id)
    .eq('blocked_profile_id', blockedProfileId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
