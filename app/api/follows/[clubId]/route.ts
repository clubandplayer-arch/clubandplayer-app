import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, jsonError } from '@/lib/api/auth';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function srHeaders(extra?: Record<string, string>) {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

// GET /api/follows/:clubId -> { following: boolean }
export async function GET(req: NextRequest, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { user } = auth.ctx;

  try {
    const { clubId } = await params;
    if (!clubId) return jsonError('Missing clubId', 400);
    if (!SUPA_URL || !SERVICE_ROLE) return jsonError('Supabase server env missing', 500);

    const url = `${SUPA_URL}/rest/v1/follows?select=club_id&user_id=eq.${user.id}&club_id=eq.${clubId}`;
    const r = await fetch(url, { headers: srHeaders(), cache: 'no-store' });
    if (!r.ok) return jsonError(`Supabase error ${r.status}`, r.status);
    const arr = (await r.json()) as any[];
    return NextResponse.json({ following: Array.isArray(arr) && arr.length > 0 });
  } catch (e: any) {
    return jsonError(e?.message || 'Unexpected error', 500);
  }
}

// POST /api/follows/:clubId -> follow
export async function POST(req: NextRequest, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { user } = auth.ctx;

  try {
    const { clubId } = await params;
    if (!clubId) return jsonError('Missing clubId', 400);
    if (!SUPA_URL || !SERVICE_ROLE) return jsonError('Supabase server env missing', 500);

    const url = `${SUPA_URL}/rest/v1/follows?on_conflict=user_id,club_id`;
    const payload = [{ user_id: user.id, club_id: clubId }];
    const r = await fetch(url, {
      method: 'POST',
      headers: srHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const t = await r.text();
      return jsonError(`Supabase error: ${t || r.status}`, r.status);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Unexpected error', 500);
  }
}

// DELETE /api/follows/:clubId -> unfollow
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { user } = auth.ctx;

  try {
    const { clubId } = await params;
    if (!clubId) return jsonError('Missing clubId', 400);
    if (!SUPA_URL || !SERVICE_ROLE) return jsonError('Supabase server env missing', 500);

    const url = `${SUPA_URL}/rest/v1/follows?user_id=eq.${user.id}&club_id=eq.${clubId}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: srHeaders({ Prefer: 'return=minimal' }),
    });
    if (!r.ok) {
      const t = await r.text();
      return jsonError(`Supabase error: ${t || r.status}`, r.status);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Unexpected error', 500);
  }
}
