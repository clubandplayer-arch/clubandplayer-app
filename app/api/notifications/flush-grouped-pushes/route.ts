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
    console.warn('[api/notifications/flush-grouped-pushes] unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    console.error('[api/notifications/flush-grouped-pushes] missing admin client');
    return NextResponse.json({ error: 'Missing Supabase admin client' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { count: pendingCount, error: pendingCountError } = await admin
    .from('grouped_push_queue')
    .select('*', { count: 'exact', head: true })
    .is('sent_at', null)
    .is('locked_at', null)
    .lte('scheduled_at', nowIso);
  if (pendingCountError) {
    console.warn('[api/notifications/flush-grouped-pushes] pending count failed', { message: pendingCountError.message });
  }
  console.info('[api/notifications/flush-grouped-pushes] pending found', { pending: pendingCount ?? null });

  const results = await flushGroupedPostPushes(admin);
  let sent = 0;
  let skipped = 0;
  const errors: Array<{ id: any; error: string }> = [];
  for (const item of results) {
    if (item?.error) errors.push({ id: item?.id ?? null, error: item.error });
    if (item?.summary?.sent) sent += Number(item.summary.sent) || 0;
    if (item?.summary?.skipped) skipped += Number(item.summary.skipped) || 0;
    if (item?.skipped) skipped += 1;
  }
  console.info('[api/notifications/flush-grouped-pushes] flush completed', {
    pending: pendingCount ?? null,
    processed: results.length,
    sent,
    skipped,
    errors: errors.length,
  });
  if (errors.length) {
    console.warn('[api/notifications/flush-grouped-pushes] item errors', { errors });
  }
  return NextResponse.json({ ok: true, pending: pendingCount ?? null, processed: results.length, sent, skipped, errors, results });
}

export async function GET(req: NextRequest) {
  return handleFlush(req);
}

export async function POST(req: NextRequest) {
  return handleFlush(req);
}
