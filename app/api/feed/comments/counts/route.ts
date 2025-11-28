import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const idsParam = search.get('ids') || '';
  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ ok: true, counts: [] }, { status: 200 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('post_comments')
    .select('post_id', { head: false })
    .in('post_id', ids);

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 200 });
  }

  const countsMap: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const key = String(row.post_id);
    countsMap[key] = (countsMap[key] ?? 0) + 1;
  });

  const counts = ids.map((id) => ({ post_id: id, count: countsMap[id] ?? 0 }));

  return NextResponse.json({ ok: true, counts }, { status: 200 });
}
