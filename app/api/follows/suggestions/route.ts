import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // evita caching aggressivo in dev

type Role = 'club' | 'athlete' | 'guest';

const CLUBS: any[] = [
  { id: 'carlentini', name: 'ASD Club Atlético Carlentini', handle: 'clubatleticocarlentini', city: 'Carlentini (SR)', sport: 'Calcio', followers: 3120, avatarUrl: '' },
  { id: 'siracusa', name: 'SSD Siracusa Academy', handle: 'siracusaacademy', city: 'Siracusa', sport: 'Calcio', followers: 1890, avatarUrl: '' },
  { id: 'catania', name: 'ASD Catania Sud', handle: 'cataniasud', city: 'Catania', sport: 'Calcio', followers: 2540, avatarUrl: '' },
  { id: 'lentini', name: 'ASD Lentini Sport', handle: 'lentinisport', city: 'Lentini', sport: 'Calcio', followers: 970, avatarUrl: '' },
];

const ATHLETES: any[] = [
  { id: 'a1', name: 'Marco Greco', handle: 'marco.greco9', city: 'Catania', sport: 'Calcio (ATT)', followers: 420, avatarUrl: '' },
  { id: 'a2', name: 'Luca Foti', handle: 'lucafoti_7', city: 'Siracusa', sport: 'Calcio (CC)', followers: 380, avatarUrl: '' },
  { id: 'a3', name: 'Davide Russo', handle: 'davide.russo', city: 'Augusta', sport: 'Calcio (POR)', followers: 210, avatarUrl: '' },
  { id: 'a4', name: 'Salvo Pappalardo', handle: 'salvo.pappa', city: 'Carlentini', sport: 'Calcio (DC)', followers: 160, avatarUrl: '' },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forRole = (url.searchParams.get('for') || 'guest') as Role;

  // Heuristica semplice:
  // - se l'utente è un atleta → suggerisci CLUBS
  // - se l'utente è un club → suggerisci ATHLETES
  // - guest → suggerisci CLUBS
  const items =
    forRole === 'club' ? ATHLETES.slice(0, 4) : CLUBS.slice(0, 4);

  return NextResponse.json({ items });
}
