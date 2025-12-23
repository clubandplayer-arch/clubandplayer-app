import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const missingClubColumn = (msg?: string | null) =>
  !!msg && /club_id/i.test(msg) && (/does not exist/i.test(msg) || /schema cache/i.test(msg));

/** POST /api/applications  Body: { opportunity_id: string, note?: string } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  await rateLimit(req as any, { key: 'apps:POST', limit: 30, window: '1m' } as any);

  const body = await req.json().catch(() => null);
  if (!body || !body.opportunity_id) return jsonError('Missing opportunity_id', 400);

  const opportunity_id = String(body.opportunity_id);
  const note = typeof body.note === 'string'
    ? body.note.trim() || null
    : typeof body.message === 'string'
      ? body.message.trim() || null
      : null;
  const status = 'submitted';

  // verifica exist e che non sia tua
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', opportunity_id)
    .single();

  if (oppErr) return jsonError(oppErr.message, 400);
  const ownerId = opp?.owner_id ?? opp?.created_by ?? null;
  if (ownerId === user.id) return jsonError('Cannot apply to your own opportunity', 400);

  // evita doppia candidatura
  const { data: exists } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', opportunity_id)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (exists) return jsonError('Already applied', 409);

  const admin = getSupabaseAdminClientOrNull();

  const insertPayload = {
    opportunity_id,
    athlete_id: user.id,
    club_id: ownerId,
    note,
    status,
  } as Record<string, any>;

  const runInsert = (client: any, payload: Record<string, any>, select: string) =>
    client.from('applications').insert(payload).select(select).single();

  let data: any = null;
  let error: any = null;

  ({ data, error } = await runInsert(supabase, insertPayload, 'id, opportunity_id, athlete_id, status, created_at, club_id'));

  if (error && missingClubColumn(error.message)) {
    const { club_id: _clubId, ...fallbackPayload } = insertPayload;
    ({ data, error } = await runInsert(supabase, fallbackPayload, 'id, opportunity_id, athlete_id, status, created_at'));
  }

  if (error && /row-level security/i.test(error.message || '') && admin) {
    ({ data, error } = await runInsert(admin, insertPayload, 'id, opportunity_id, athlete_id, status, created_at, club_id'));
  }

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
