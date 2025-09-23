import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Role = 'club' | 'athlete' | 'guest';

type Suggestion = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  city?: string;
  sport?: string;
  followers?: number;
};

/**
 * Dataset di esempio più lungo per abilitare paginazione.
 * In produzione sostituire con query DB/servizio suggerimenti.
 */
const CLUBS: Suggestion[] = [
  { id: 'c1', name: 'ASD Club Atlético Carlentini', handle: 'clubatleticocarlentini', city: 'Carlentini (SR)', sport: 'Calcio', followers: 3120 },
  { id: 'c2', name: 'SSD Siracusa Academy', handle: 'siracusaacademy', city: 'Siracusa', sport: 'Calcio', followers: 1890 },
  { id: 'c3', name: 'ASD Catania Sud', handle: 'cataniasud', city: 'Catania', sport: 'Calcio', followers: 2540 },
  { id: 'c4', name: 'ASD Lentini Sport', handle: 'lentinisport', city: 'Lentini', sport: 'Calcio', followers: 970 },
  { id: 'c5', name: 'ASD Augusta Calcio', handle: 'augustacalcio', city: 'Augusta', sport: 'Calcio', followers: 720 },
  { id: 'c6', name: 'ASD Priolo Soccer', handle: 'priolosoccer', city: 'Priolo', sport: 'Calcio', followers: 610 },
  { id: 'c7', name: 'ASD Villasmundo', handle: 'villasmundoasd', city: 'Villasmundo', sport: 'Calcio', followers: 540 },
  { id: 'c8', name: 'ASD Solarino', handle: 'solarinocalcio', city: 'Solarino', sport: 'Calcio', followers: 505 },
  { id: 'c9', name: 'ASD Floridia', handle: 'floridiacalcio', city: 'Floridia', sport: 'Calcio', followers: 480 },
  { id: 'c10', name: 'ASD Avola', handle: 'avolacalcio', city: 'Avola', sport: 'Calcio', followers: 450 },
  { id: 'c11', name: 'ASD Pachino', handle: 'pachinocalcio', city: 'Pachino', sport: 'Calcio', followers: 420 },
  { id: 'c12', name: 'ASD Noto', handle: 'notocalcio', city: 'Noto', sport: 'Calcio', followers: 390 },
];

const ATHLETES: Suggestion[] = [
  { id: 'a1', name: 'Marco Greco', handle: 'marco.greco9', city: 'Catania', sport: 'Calcio (ATT)', followers: 420 },
  { id: 'a2', name: 'Luca Foti', handle: 'lucafoti_7', city: 'Siracusa', sport: 'Calcio (CC)', followers: 380 },
  { id: 'a3', name: 'Davide Russo', handle: 'davide.russo', city: 'Augusta', sport: 'Calcio (POR)', followers: 210 },
  { id: 'a4', name: 'Salvo Pappalardo', handle: 'salvo.pappa', city: 'Carlentini', sport: 'Calcio (DC)', followers: 160 },
  { id: 'a5', name: 'Giorgio Di Mauro', handle: 'giorgiodm', city: 'Floridia', sport: 'Calcio (TS)', followers: 300 },
  { id: 'a6', name: 'Andrea Rizzo', handle: 'andrearizzo', city: 'Avola', sport: 'Calcio (ALA)', followers: 280 },
  { id: 'a7', name: 'Matteo Spina', handle: 'matt.spina', city: 'Siracusa', sport: 'Calcio (CC)', followers: 265 },
  { id: 'a8', name: 'Simone Caruso', handle: 'simocaruso', city: 'Catania', sport: 'Calcio (ATT)', followers: 410 },
  { id: 'a9', name: 'Riccardo Neri', handle: 'riccardo.neri', city: 'Priolo', sport: 'Calcio (TD)', followers: 150 },
  { id: 'a10', name: 'Pietro Arena', handle: 'pietro.arena', city: 'Lentini', sport: 'Calcio (CC)', followers: 245 },
  { id: 'a11', name: 'Alessio Grella', handle: 'agrella', city: 'Villasmundo', sport: 'Calcio (DC)', followers: 190 },
  { id: 'a12', name: 'Tommaso Fazio', handle: 'tfazio', city: 'Noto', sport: 'Calcio (POR)', followers: 175 },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forRole = (url.searchParams.get('for') || 'guest') as Role;

  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitRaw || '4', 10) || 4, 1), 8); // 1..8, default 4

  const cursorRaw = url.searchParams.get('cursor'); // offset 0-based
  const offset = Math.max(parseInt(cursorRaw || '0', 10) || 0, 0);

  // Heuristica:
  // - atleta → suggerisci CLUBS
  // - club → suggerisci ATHLETES
  // - guest → CLUBS
  const source = forRole === 'club' ? ATHLETES : CLUBS;

  // Ordiniamo per followers desc per un minimo di coerenza
  const sorted = [...source].sort((a, b) => (b.followers || 0) - (a.followers || 0));

  const slice = sorted.slice(offset, offset + limit);
  const nextCursor = offset + limit < sorted.length ? String(offset + limit) : null;

  return NextResponse.json({
    items: slice,
    nextCursor, // string | null
  });
}
