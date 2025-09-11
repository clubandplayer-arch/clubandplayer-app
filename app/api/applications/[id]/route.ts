import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

// PATCH /api/applications/:id   { status: 'submitted'|'seen'|'accepted'|'rejected' }
// Solo l'owner dell'opportunità può cambiare lo status
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:PATCH', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  const allowed = ['submitted', 'seen', 'accepted', 'rejected'];
  if (!allowed.includes(status)) return jsonError('Invalid status', 400);

  // Recupero opportunità della candidatura
  const { data: app, error: e1 } = await supabase
    .from('applications')
    .select('opportunity_id')
    .eq('id', id)
    .single();
  if (e1) return jsonError(e1.message, 400);

  const { data: opp, error: e2 } = await supabase
    .from('opportunities')
    .select('created_by')
    .eq('id', app.opportunity_id)
    .single();
  if (e2) return jsonError(e2.message, 400);
  if (!opp || opp.created_by !== user.id) return jsonError('Forbidden', 403);

  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ data });
});

// DELETE /api/applications/:id
// L'atleta può ritirare la propria; l'owner può rimuovere una candidatura
export const DELETE = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: 'applications:DELETE', limit: 30, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').pop();
  if (!id) return jsonError('Missing id', 400);

  const { data: app, error: e1 } = await supabase
    .from('applications')
    .select('athlete_id, opportunity_id')
    .eq('id', id)
    .single();
  if (e1) return jsonError(e1.message, 400);

  // Se non è l'atleta, verifico che sia l'owner dell'opportunità
  if (app.athlete_id !== user.id) {
    const { data: opp, error: e2 } = await supabase
      .from('opportunities')
      .select('created_by')
      .eq('id', app.opportunity_id)
      .single();
    if (e2) return jsonError(e2.message, 400);
    if (!opp || opp.created_by !== user.id) return jsonError('Forbidden', 403);
  }

  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
});
