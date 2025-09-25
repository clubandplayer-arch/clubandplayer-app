import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/**
 * Crea una candidatura per l’utente corrente (athlete_id = auth.uid()).
 * body: { opportunity_id: string, note?: string }
 */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'apps:POST', limit: 20, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => ({}));
  const opportunity_id = (body.opportunity_id ?? '').trim();
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null;

  if (!opportunity_id) return jsonError('opportunity_id required', 400);

  // Verifica esistenza opportunità e che non sia tua
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, created_by')
    .eq('id', opportunity_id)
    .single();

  if (oppErr || !opp) return jsonError('Opportunity not found', 404);
  if (opp.created_by === user.id) {
    return jsonError('Cannot apply to your own opportunity', 400);
  }

  // Inserimento candidatura
  const { data, error } = await supabase
    .from('applications')
    .insert({
      opportunity_id,
      athlete_id: user.id, // RLS: = auth.uid()
      note,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (error) {
    // Unique constraint (una sola candidatura per opportunità)
    if ((error as any).code === '23505') {
      return jsonError('Application already exists', 409);
    }
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ ok: true, data });
});
