import { NextRequest, NextResponse } from 'next/server';

import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type AllowedStatus = 'open' | 'closed';

function normalizeStatus(v: unknown): AllowedStatus | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'aperto' || s === 'open') return 'open';
  if (s === 'chiuso' || s === 'closed') return 'closed';
  return null;
}

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req as any, { key: 'opportunities:status', limit: 60, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const id = req.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!id) return jsonError('Missing id', 400);

  const body = await req.json().catch(() => ({}));
  const status = normalizeStatus((body as any)?.status);
  if (!status) return jsonError('Invalid status', 400);

  let myProfileId: string | null = null;
  try {
    const { data: meProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    myProfileId = (meProfile as any)?.id ?? null;
  } catch {
    // ignore
  }

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by, club_id')
    .eq('id', id)
    .maybeSingle();
  if (oppErr || !opp) return jsonError(oppErr?.message || 'Not found', 404);

  const ownerCandidates = [
    (opp as any)?.owner_id,
    (opp as any)?.created_by,
    (opp as any)?.club_id,
  ]
    .filter(Boolean)
    .map((v) => String(v));
  const viewerKeys = Array.from(new Set([user.id, myProfileId].filter(Boolean).map(String)));
  const isOwner = ownerCandidates.some((owner) => viewerKeys.includes(owner));
  if (!isOwner) return jsonError('Forbidden', 403);

  const admin = getSupabaseAdminClientOrNull();

  const payload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
    updated_by: myProfileId ?? user.id,
  };

  const doUpdate = (client: any, body: Record<string, any>) =>
    client.from('opportunities').update(body).eq('id', id).select('id,status,updated_at').maybeSingle();

  let { data, error } = await doUpdate(supabase, payload);

  if (error && /column\s+updated_by/i.test(error.message || '')) {
    const fallbackPayload = { status, updated_at: payload.updated_at } as Record<string, any>;
    ({ data, error } = await doUpdate(supabase, fallbackPayload));
  }

  if (error && /row-level security/i.test(error.message || '') && admin) {
    ({ data, error } = await doUpdate(admin, payload));
  }

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ data });
});
