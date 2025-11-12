import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/** POST /api/applications  Body: { opportunity_id: string, message?: string } */
export const POST = withAuth(async (req: NextRequest, { supabase, user }: any) => {
  await rateLimit(req as any, { key: 'apps:POST', limit: 30, window: '1m' } as any);

  const body = await req.json().catch(() => null);
  if (!body || !body.opportunity_id) return jsonError('Missing opportunity_id', 400);

  const opportunity_id = String(body.opportunity_id);

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

  const { data, error } = await supabase
    .from('applications')
    .insert({
      opportunity_id,
      athlete_id: user.id,
      message: body.message ?? null,
    })
    .select('id, opportunity_id, athlete_id, created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data }, { status: 201 });
});
