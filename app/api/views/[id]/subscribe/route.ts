// app/api/views/[id]/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Esempio minimale che “sottoscrive” una view e risponde con JSON.
// Nota: in Next 15 il tipo ufficiale del context è { params: Promise<{ id: string }> }
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // qui potresti salvare su DB la sottoscrizione dell’utente alla view `id`
  // ... codice reale ...

  return NextResponse.json({
    ok: true,
    subscribed: true,
    id,
  });
}
