import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

type AllowedStatus = 'accepted' | 'rejected';

const ALLOWED: AllowedStatus[] = ['accepted', 'rejected'];

function normalizeStatus(v: unknown): AllowedStatus | null {
  const s = String(v || '').trim().toLowerCase();
  return ALLOWED.includes(s as AllowedStatus) ? (s as AllowedStatus) : null;
}

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req as any, { key: 'applications:status', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const status = normalizeStatus((body as any)?.status);
  if (!status) return jsonError('Invalid status', 400);

  const { data: app, error: appErr } = await supabase
    .from('applications')
    .select('opportunity_id, club_id')
    .eq('id', id)
    .maybeSingle();
  if (appErr || !app) return jsonError(appErr?.message || 'Not found', 404);

  const opportunityId = (app as any).opportunity_id as string | null;
  const clubId = (app as any).club_id as string | null;

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('owner_id, created_by')
    .eq('id', opportunityId)
    .maybeSingle();
  if (oppErr) return jsonError(oppErr.message, 400);

  const ownerId =
    (opp as any)?.owner_id ||
    (opp as any)?.created_by ||
    clubId ||
    null;

  if (!ownerId || ownerId !== user.id) return jsonError('Forbidden', 403);

  const payload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from('applications')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error && /column\s+updated_by/i.test(error.message || '')) {
    const fallbackPayload = { status, updated_at: payload.updated_at };
    const { data: fbData, error: fbError } = await supabase
      .from('applications')
      .update(fallbackPayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (fbError) return jsonError(fbError.message, 400);
    return NextResponse.json({ data: fbData });
  }

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ data });
});
