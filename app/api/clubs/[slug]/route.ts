import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Club = {
  id: string;
  slug: string;
  name: string;
  city?: string;
  sport?: string;
  avatarUrl?: string;
  coverUrl?: string;
  about?: string;
  followers?: number;
};

const CLUBS: Record<string, Club> = {
  'club-atletico-carlentini': {
    id: 'carlentini',
    slug: 'club-atletico-carlentini',
    name: 'ASD Club Atlético Carlentini',
    city: 'Carlentini (SR)',
    sport: 'Calcio',
    avatarUrl: '',
    coverUrl: '',
    about:
      'Club dilettantistico focalizzato su crescita giovani e comunità locale. Stagione 2025/26.',
    followers: 3120,
  },
  'siracusa-academy': {
    id: 'siracusa',
    slug: 'siracusa-academy',
    name: 'SSD Siracusa Academy',
    city: 'Siracusa',
    sport: 'Calcio',
    avatarUrl: '',
    coverUrl: '',
    about: 'Settore giovanile e prima squadra.',
    followers: 1890,
  },
};

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params; // 👈 Next 15.5: params è Promise
  const key = (slug || '').toLowerCase();
  const club = CLUBS[key];

  if (!club) {
    return NextResponse.json({ ok: false, error: 'Club non trovato' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, club });
}
