import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'clubandplayer-app',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    ts: new Date().toISOString(),
  });
}
