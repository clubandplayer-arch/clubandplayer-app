// app/api/views/[id]/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // qui rimuoveresti la sottoscrizione alla view `id`
  // ... codice reale ...

  return NextResponse.json({
    ok: true,
    subscribed: false,
    id,
  });
}
