import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Athlete = {
  id: string;          // usato nel follow cookie
  handle: string;      // usato nel path pubblico
  name: string;
  age?: number;
  position?: string;   // es. ATT, CC, POR...
  city?: string;
  sport?: string;
  avatarUrl?: string;
  coverUrl?: string;
  about?: string;
  followers?: number;
};

const ATHLETES: Record<string, Athlete> = {
  'davide-bianchi': {
    id: 'ath-davide-bianchi',
    handle: 'davide-bianchi',
    name: 'Davide Bianchi',
    age: 21,
    position: 'ATT',
    city: 'Siracusa',
    sport: 'Calcio',
    avatarUrl: '',
    coverUrl: '',
    about: 'Attaccante classe 2004, rapido sul breve, buon senso del gol.',
    followers: 420,
  },
  'marco-greco': {
    id: 'ath-marco-greco',
    handle: 'marco-greco',
    name: 'Marco Greco',
    age: 22,
    position: 'ATT',
    city: 'Catania',
    sport: 'Calcio',
    avatarUrl: '',
    coverUrl: '',
    about: 'Punta centrale strutturata, gioco spalle alla porta.',
    followers: 380,
  },
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ handle: string }> },
) {
  const { handle } = await context.params; // Next 15.5: Promise
  const key = (handle || '').toLowerCase();
  const athlete = ATHLETES[key];

  if (!athlete) {
    return NextResponse.json({ ok: false, error: 'Atleta non trovato' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, athlete });
}
