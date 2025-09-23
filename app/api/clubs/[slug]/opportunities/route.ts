import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Opportunity = {
  id: string;
  title: string;
  clubId: string;
  clubName: string;
  city?: string;
  sport?: string;
  roleName?: string;
  createdAt?: string;
};

const DATA: Record<string, Opportunity[]> = {
  carlentini: [
    {
      id: 'opp-car-001',
      title: 'Prima Squadra — Terzino Destro',
      clubId: 'carlentini',
      clubName: 'ASD Club Atlético Carlentini',
      city: 'Carlentini',
      sport: 'Calcio',
      roleName: 'TD',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: 'opp-car-002',
      title: 'Under 19 — Centrocampista',
      clubId: 'carlentini',
      clubName: 'ASD Club Atlético Carlentini',
      city: 'Carlentini',
      sport: 'Calcio',
      roleName: 'CC',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
  siracusa: [
    {
      id: 'opp-sir-001',
      title: 'U17 — Portiere',
      clubId: 'siracusa',
      clubName: 'SSD Siracusa Academy',
      city: 'Siracusa',
      sport: 'Calcio',
      roleName: 'POR',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
  ],
};

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const slug = (params?.slug || '').toLowerCase();
  // mappa slug→clubId (semplice euristica)
  const clubId = slug.includes('carlentini') ? 'carlentini' : slug.includes('siracusa') ? 'siracusa' : slug;
  const items = DATA[clubId] ?? [];
  return NextResponse.json({ items });
}
