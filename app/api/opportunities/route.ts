import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// GET: lista opportunità (placeholder safe: evita 405 anche senza DB)
export async function GET() {
  try {
    // TODO: sostituisci con la tua query al DB usando i parametri di ricerca
    return NextResponse.json({
      data: [],     // <- array di opportunità
      page: 1,
      pageSize: 20,
      total: 0,
    });
  } catch (e) {
    return NextResponse.json({ error: 'list_failed' }, { status: 500 });
  }
}

// POST: crea nuova opportunità
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: salva su DB "body"

    // Revalidate delle liste
    revalidatePath('/opportunities');
    revalidatePath('/feed');
    revalidatePath('/my/opportunities');

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
