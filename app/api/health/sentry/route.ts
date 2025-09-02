// app/api/health/sentry/route.ts
import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability';

export const runtime = 'nodejs';

export async function GET() {
  try {
    throw new Error('Sentry smoke test 🔥');
  } catch (e) {
    reportError(e, { component: 'health/sentry' });
    return NextResponse.json({ ok: true, sent: true });
  }
}
