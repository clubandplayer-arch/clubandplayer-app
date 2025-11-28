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
    .select('post_id, count:id', { head: false })
    .in('post_id', ids)
    .group('post_id');

  if (error) {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, counts: data ?? [] }, { status: 200 });
}
