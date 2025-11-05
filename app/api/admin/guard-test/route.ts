// app/api/admin/guard-test/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';

export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  const ok = await isAdminUser(supabase, user);
  if (!ok) return NextResponse.json({ ok: false, role: 'not-admin' }, { status: 403 });
  return NextResponse.json({ ok: true, role: 'admin' });
});
