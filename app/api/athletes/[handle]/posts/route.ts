import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Post = {
  id: string;
  text: string;
  createdAt: string; // ISO
};

const POSTS: Record<string, Post[]> = {
  'davide-bianchi': [
    {
      id: 'p_db_1',
      text: 'Vittoria 2-1 in amichevole! ⚽️',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: 'p_db_2',
      text: 'Seduta di forza + rifinitura al tiro.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
  'marco-greco': [
    {
      id: 'p_mg_1',
      text: 'Allenamento ad alta intensità ✅',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
  ],
};

export async function GET(_req: NextRequest, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const items = POSTS[(handle || '').toLowerCase()] ?? [];
  // Ordina dal più recente
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ items });
}
