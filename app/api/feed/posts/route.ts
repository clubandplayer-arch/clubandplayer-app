// app/api/feed/posts/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/feed/posts
 * Ritorna gli ultimi post dal DB.
 * Nota: la RLS deve permettere SELECT a anon+authenticated (policy "posts_read_all").
 */
export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('posts')
    .select('id, author_id, text, content, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    // Log minimale (senza dati sensibili)
    console.error('feed/posts GET error:', error.message);
    return NextResponse.json(
      { items: [], error: 'unavailable' },
      { status: 200 }, // torniamo 200 così la UI non esplode
    );
  }

  // Normalizziamo: alcune migrazioni usano "text", altre "content"
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    text: row.text ?? row.content ?? '',
    createdAt: row.created_at,
    authorId: row.author_id ?? null,
  }));

  return NextResponse.json({ items }, { status: 200 });
}
