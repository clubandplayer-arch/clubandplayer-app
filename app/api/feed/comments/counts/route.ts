import { type NextRequest } from 'next/server';
import { dbError, successResponse, validationError } from '@/lib/api/feedFollowResponses';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CommentCountsQuerySchema, type CommentCountsQueryInput } from '@/lib/validation/feed';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const parsed = CommentCountsQuerySchema.safeParse(Object.fromEntries(search.entries()));

  if (!parsed.success) {
    return validationError('Parametri non validi', parsed.error.flatten());
  }

  const { ids }: CommentCountsQueryInput = parsed.data;

  if (!ids.length) {
    return successResponse({ counts: [] });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('post_comments')
    .select('post_id', { head: false })
    .in('post_id', ids);

  if (error) {
    return dbError('Errore nel recupero dei conteggi', { message: error?.message });
  }

  const countsMap: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const key = String(row.post_id);
    countsMap[key] = (countsMap[key] ?? 0) + 1;
  });

  const counts = ids.map((id) => ({ post_id: id, count: countsMap[id] ?? 0 }));

  return successResponse({ counts });
}
