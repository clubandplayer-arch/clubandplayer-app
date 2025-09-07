import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** POST /api/opportunities/:id/apply  { note? } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:POST', limit: 20, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0]; // :id
  if (!id) return jsonError('Missing opportunity id', 400);

  const body = await req.json().catch(() => ({} as any));
  const note = typeof body.note === 'string' ? body.note.trim() : null;

  const { data, error } = await supabase
    .from('applications')
    .insert({ opportunity_id: id, athlete_id: user.id, note, status: 'submitted' }) // <-- athlete_id
    .select('*')
    .single();

  if (error) {
    // 23505 = unique_violation (es. unique su (opportunity_id, athlete_id))
    if ((error as any).code === '23505') return jsonError('Already applied', 409);
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ data }, { status: 201 });
});
