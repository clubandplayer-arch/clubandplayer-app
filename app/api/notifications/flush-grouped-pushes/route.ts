import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { flushGroupedPostPushes } from '@/lib/push/groupedPostPushQueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const authorization = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  return token === expected;
}

async function handleFlush(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({ error: 'Missing Supabase admin client' }, { status: 500 });
  }

  const results = await flushGroupedPostPushes(admin);
  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function GET(req: NextRequest) {
  return handleFlush(req);
}

export async function POST(req: NextRequest) {
  return handleFlush(req);
}
