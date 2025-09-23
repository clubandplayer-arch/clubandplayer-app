import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // TODO: derivare dallo user (whoami) o dal DB. Per ora default:
  const club = {
    id: 'carlentini',
    slug: 'club-atletico-carlentini',
    name: 'ASD Club Atlético Carlentini',
  };
  return NextResponse.json({ ok: true, club });
}
