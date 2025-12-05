import { type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  dbError,
  notAuthenticated,
  successResponse,
  unknownError,
  validationError,
} from '@/lib/api/feedFollowResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import {
  CreateReactionSchema,
  ReactionCountsQuerySchema,
  type CreateReactionInput,
  type ReactionCountsQueryInput,
} from '@/lib/validation/feed';

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

async function fetchReactionRows(ids: string[], client: SupabaseClient<any, any, any>) {
  const { data, error } = await client
    .from('post_reactions')
    .select('post_id, reaction, user_id')
    .in('post_id', ids);
  if (error) throw error;
  return (data || []) as Array<{ post_id: string; reaction: ReactionType; user_id?: string }>;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const url = new URL(req.url);
  const parsed = ReactionCountsQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }

  const { ids }: ReactionCountsQueryInput = parsed.data;

  if (!ids.length) {
    return successResponse({ counts: [], mine: [] });
  }

  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    let rows: Array<{ post_id: string; reaction: ReactionType; user_id?: string }> = [];
    try {
      rows = await fetchReactionRows(ids, supabase);
    } catch (clientErr) {
      const admin = getSupabaseAdminClientOrNull();
      if (admin) {
        rows = await fetchReactionRows(ids, admin);
      } else {
        throw clientErr;
      }
    }

    const counts = buildCounts(rows);
    const mine: { post_id: string; reaction: ReactionType }[] = [];

    for (const row of rows) {
      if (userId && row.user_id === userId) {
        mine.push({ post_id: row.post_id as string, reaction: row.reaction as ReactionType });
      }
    }

    return successResponse({ counts, mine });
  } catch (err: any) {
    console.error('[feed/reactions][GET] failed', {
      ids,
      message: err?.message,
      details: err,
    });
    if (isMissingTable(err)) {
      return successResponse({ counts: [], mine: [], missingTable: true });
    }
    return unknownError({ endpoint: '/api/feed/reactions', error: err, context: { method: 'GET', ids } });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const parsedBody = CreateReactionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    console.warn('[feed/reactions][POST] invalid payload', parsedBody.error.flatten());
    return validationError('Payload non valido', parsedBody.error.flatten());
  }

  const body: CreateReactionInput = parsedBody.data;
  const postId = body.postId;
  const reaction = (body.reaction ?? '') as ReactionType | '';

  const { data: userRes, error: authError } = await supabase.auth.getUser();
  if (authError || !userRes?.user) {
    return notAuthenticated('Utente non autenticato');
  }

  const validReaction = reaction === '' ? null : reaction;

  try {
    console.info('[feed/reactions][POST] incoming', {
      userId: userRes.user.id,
      postId,
      reaction: validReaction,
    });

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

    let rows: Array<{ post_id: string; reaction: ReactionType; user_id?: string }> = [];
    try {
      rows = await fetchReactionRows([postId], supabase);
    } catch (clientErr) {
      const admin = getSupabaseAdminClientOrNull();
      if (admin) {
        rows = await fetchReactionRows([postId], admin);
      } else {
        throw clientErr;
      }
    }

    const counts = buildCounts(rows);
    const mine = rows.find((r) => r.user_id === userRes.user.id)?.reaction ?? null;

    return successResponse({ postId, counts, mine });
  } catch (err: any) {
    console.error('[feed/reactions][POST] failed', {
      userId: userRes?.user?.id,
      postId,
      reaction: validReaction,
      message: err?.message,
      details: err,
    });
    if (isMissingTable(err)) {
      return dbError('Tabella post_reactions mancante', { error: 'missing_table_post_reactions' });
    }
    return unknownError({ endpoint: '/api/feed/reactions', error: err, context: { method: 'POST', postId } });
  }
}
