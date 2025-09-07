import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

function msg(m: unknown) {
  return typeof m === 'string' ? m.toLowerCase() : String(m || '').toLowerCase();
}
function has(txt: string, snippet: string) {
  return txt.includes(snippet.toLowerCase());
}

async function tryInsert(
  supabase: any,
  payload: Record<string, any>
): Promise<{ data: any; error: any }> {
  return await supabase.from('applications').insert(payload).select('*').single();
}

/** POST /api/opportunities/:id/apply  { note? } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: 'applications:POST', limit: 20, window: '1m' } as any); }
  catch { return jsonError('Too Many Requests', 429); }

  const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0]; // :id
  if (!id) return jsonError('Missing opportunity id', 400);

  const body = await req.json().catch(() => ({} as any));
  const note = typeof body.note === 'string' ? body.note.trim() : null;

  const base = { opportunity_id: id, note, status: 'submitted' as const };

  // 1) tenta con entrambi i campi (per coprire schema con entrambi NOT NULL)
  let payload: Record<string, any> = { ...base, athlete_id: user.id, applicant_id: user.id };
  let { data, error } = await tryInsert(supabase, payload);

  if (error) {
    // Unique violation (già candidato)
    if ((error as any).code === '23505') return jsonError('Already applied', 409);

    const m = msg((error as any).message);

    // Se una colonna non esiste, riprova con l'altra
    if (has(m, 'column "athlete_id"') && has(m, 'does not exist')) {
      ({ data, error } = await tryInsert(supabase, { ...base, applicant_id: user.id }));
    } else if (has(m, 'column "applicant_id"') && has(m, 'does not exist')) {
      ({ data, error } = await tryInsert(supabase, { ...base, athlete_id: user.id }));
    }
    // Se una colonna è NOT NULL e manca, ritenta includendola
    else if (has(m, 'null value in column "athlete_id"')) {
      ({ data, error } = await tryInsert(supabase, { ...base, athlete_id: user.id }));
    } else if (has(m, 'null value in column "applicant_id"')) {
      ({ data, error } = await tryInsert(supabase, { ...base, applicant_id: user.id }));
    }
  }

  if (error) return jsonError((error as any).message || 'Insert failed', 400);
  return NextResponse.json({ data }, { status: 201 });
});
