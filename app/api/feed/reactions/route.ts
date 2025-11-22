import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

type ReactionType = 'like' | 'love' | 'care' | 'angry';

function isMissingTable(err?: any) {
  const msg = (err?.message || '').toString();
  return /post_reactions/.test(msg) && /does not exist/i.test(msg);
}

function buildCounts(rows: Array<{ post_id: string; reaction: ReactionType; user_id?: string }>) {
  const countsMap = new Map<string, { post_id: string; reaction: ReactionType; count: number }>();
  for (const row of rows) {
    const key = `${row.post_id}-${row.reaction}`;
    const current = countsMap.get(key) || { post_id: row.post_id, reaction: row.reaction, count: 0 };
    current.count += 1;
    countsMap.set(key, current);
  }
  return Array.from(countsMap.values());
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

    const { data: rows, error } = await supabase
      .from('post_reactions')
      .select('post_id, reaction, user_id')
      .in('post_id', ids);

    if (error) throw error;

    const counts = buildCounts((rows || []) as Array<{ post_id: string; reaction: ReactionType; user_id?: string }>);
    const mine: { post_id: string; reaction: ReactionType }[] = [];

    for (const row of rows || []) {
      if (userId && row.user_id === userId) {
        mine.push({ post_id: row.post_id as string, reaction: row.reaction as ReactionType });
      }
    }

    return NextResponse.json({ ok: true, counts, mine });
  } catch (err: any) {
    if (isMissingTable(err)) {
      return NextResponse.json({ ok: true, counts: [], mine: [], missingTable: true });
    }
    return NextResponse.json({ ok: false, error: err?.message || 'Errore' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  let body: { postId?: string; reaction?: ReactionType | null } = {};
  try {
    body = await req.json();
  } catch {
    /* noop */
  }

  const postId = (body.postId || '').toString();
  const reaction = (body.reaction ?? '').toString() as ReactionType | '';

  if (!postId) {
    return jsonError('Invalid payload', 400);
  }

  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return jsonError('not_authenticated', 401);
  }

  const validReaction = reaction === '' ? null : reaction;
  if (validReaction && !['like', 'love', 'care', 'angry'].includes(validReaction)) {
    return jsonError('invalid_reaction', 400);
  }

  try {
    const { data: existing, error } = await supabase
      .from('post_reactions')
      .select('id, reaction')
      .eq('post_id', postId)
      .eq('user_id', userRes.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!validReaction) {
      if (existing?.id) {
        const { error: delErr } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existing.id);
        if (delErr) throw delErr;
      }
    } else if (existing?.id) {
      if (existing.reaction === validReaction) {
        const { error: delErr } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existing.id);
        if (delErr) throw delErr;
      } else {
        const { error: upErr } = await supabase
          .from('post_reactions')
          .update({ reaction: validReaction })
          .eq('id', existing.id);
        if (upErr) throw upErr;
      }
    } else {
      const { error: insErr } = await supabase
        .from('post_reactions')
        .insert({ post_id: postId, user_id: userRes.user.id, reaction: validReaction });

      if (insErr) throw insErr;
    }

    const { data: rows, error: summaryErr } = await supabase
      .from('post_reactions')
      .select('post_id, reaction, user_id')
      .eq('post_id', postId);
    if (summaryErr) throw summaryErr;

    const counts = buildCounts((rows || []) as Array<{ post_id: string; reaction: ReactionType; user_id?: string }>);
    const mine = (rows || []).find((r) => r.user_id === userRes.user.id)?.reaction ?? null;

    return NextResponse.json({ ok: true, postId, counts, mine });
  } catch (err: any) {
    if (isMissingTable(err)) {
      return jsonError('missing_table_post_reactions', 400);
    }
    return jsonError(err?.message || 'Errore', 400);
  }
}
