import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** GET /api/profiles/:id  (legge profilo per user_id) */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  try {
    await rateLimit(req, { key: 'profiles:GET', limit: 120, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', id)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!data) return jsonError('Not found', 404);

  return NextResponse.json({ data });
});
