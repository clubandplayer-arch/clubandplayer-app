import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // TODO: derivare da whoami/DB. Stub sicuro per dev:
  const athlete = {
    id: 'ath-davide-bianchi',
    handle: 'davide-bianchi',
    name: 'Davide Bianchi',
  };
  return NextResponse.json({ ok: true, athlete });
}
