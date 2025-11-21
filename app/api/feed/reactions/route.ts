import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

type ReactionType = 'goal' | 'red_card';

function isMissingTable(err?: any) {
  const msg = (err?.message || '').toString();
  return /feed_post_reactions/.test(msg) && /does not exist/i.test(msg);
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const url = new URL(req.url);
  const idsParam = (url.searchParams.get('ids') || '').trim();
  const ids = idsParam
    ? Array.from(new Set(idsParam.split(',').map((v) => v.trim()).filter(Boolean)))
    : [];

  if (!ids.length) {
    return NextResponse.json({ ok: true, counts: [], mine: [] });
  }

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const { data: counts, error } = await supabase
      .from('feed_post_reactions')
      .select('post_id, reaction_type, count:count(*)')
      .in('post_id', ids)
      .group('post_id, reaction_type');

    if (error) throw error;

    let mine: { post_id: string; reaction_type: ReactionType }[] = [];
    if (userId) {
      const { data: mineRows, error: mineErr } = await supabase
        .from('feed_post_reactions')
        .select('post_id, reaction_type')
        .eq('user_id', userId)
        .in('post_id', ids);
      if (mineErr) throw mineErr;
      mine = (mineRows || []) as any;
    }

    return NextResponse.json({ ok: true, counts: counts ?? [], mine });
  } catch (err: any) {
    if (isMissingTable(err)) {
      return NextResponse.json({ ok: true, counts: [], mine: [], missingTable: true });
    }
    return NextResponse.json({ ok: false, error: err?.message || 'Errore' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  let body: { postId?: string; reactionType?: ReactionType } = {};
  try {
    body = await req.json();
  } catch {
    /* noop */
  }

  const postId = (body.postId || '').toString();
  const reactionType = (body.reactionType || '').toString() as ReactionType;

  if (!postId || (reactionType !== 'goal' && reactionType !== 'red_card')) {
    return jsonError('Invalid payload', 400);
  }

  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return jsonError('not_authenticated', 401);
  }

  try {
    const { data: existing, error } = await supabase
      .from('feed_post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userRes.user.id)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    if (error) throw error;

    if (existing?.id) {
      const { error: delErr } = await supabase
        .from('feed_post_reactions')
        .delete()
        .eq('id', existing.id);
      if (delErr) throw delErr;
      return NextResponse.json({ ok: true, status: 'removed' });
    }

    const { error: insErr } = await supabase
      .from('feed_post_reactions')
      .insert({ post_id: postId, user_id: userRes.user.id, reaction_type });

    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, status: 'added' });
  } catch (err: any) {
    if (isMissingTable(err)) {
      return jsonError('missing_table_feed_post_reactions', 400);
    }
    return jsonError(err?.message || 'Errore', 400);
  }
}
