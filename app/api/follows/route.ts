import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, jsonError } from '@/lib/api/auth';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // solo lato server

function srHeaders() {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  };
}

// GET /api/follows -> { data: string[] } (club_id seguiti da me)
export async function GET(req: NextRequest) {
  // auth: gestisci il ritorno union { ctx } | { res }
  const auth = await requireAuth(req);
  if ('res' in auth) return auth.res;
  const { user } = auth.ctx;

  try {
    if (!SUPA_URL || !SERVICE_ROLE) {
      return jsonError('Supabase server env missing', 500);
    }
    const url = `${SUPA_URL}/rest/v1/follows?select=club_id&user_id=eq.${user.id}`;
    const r = await fetch(url, { headers: srHeaders(), cache: 'no-store' });
    if (!r.ok) {
      const t = await r.text();
      return jsonError(`Supabase error: ${t || r.status}`, r.status);
    }
    const rows = (await r.json()) as Array<{ club_id: string }>;
    const ids = rows.map((x) => x.club_id).filter(Boolean);
    return NextResponse.json({ data: ids });
  } catch (e: any) {
    return jsonError(e?.message || 'Unexpected error', 500);
  }
}
