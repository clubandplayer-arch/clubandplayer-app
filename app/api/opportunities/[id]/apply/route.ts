import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function wantsApplicantId(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes('applicant_id') || m.includes('column "applicant_id"') || m.includes('null value in column "applicant_id"');
}
function wantsAthleteId(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes('athlete_id') || m.includes('column "athlete_id"') || m.includes('null value in column "athlete_id"');
}

/** POST /api/opportunities/:id/apply  { note? } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:POST', limit: 20, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0]; // :id
  if (!id) return jsonError('Missing opportunity id', 400);

  const body = await req.json().catch(() => ({} as any));
  const note = typeof body.note === 'string' ? body.note.trim() : null;

  // 1) primo tentativo con athlete_id
  let { data, error } = await supabase
    .from('applications')
    .insert({ opportunity_id: id, athlete_id: user.id, note, status: 'submitted' } as any)
    .select('*')
    .single();

  // 23505 = unique_violation (già candidato)
  if (error && (error as any).code === '23505') return jsonError('Already applied', 409);

  // Se fallisce perché il DB vuole applicant_id, riproviamo
  if (error && wantsApplicantId((error as any).message)) {
    const retry = await supabase
      .from('applications')
      .insert({ opportunity_id: id, applicant_id: user.id, note, status: 'submitted' } as any)
      .select('*')
      .single();

    if (retry.error) {
      if ((retry.error as any).code === '23505') return jsonError('Already applied', 409);
      return jsonError(retry.error.message, 400);
    }
    data = retry.data;
    error = null;
  }

  if (error) return jsonError((error as any).message || 'Insert failed', 400);
  return NextResponse.json({ data }, { status: 201 });
});
