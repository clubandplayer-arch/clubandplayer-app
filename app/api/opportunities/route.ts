import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
// ...i tuoi import

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ...creazione su DB

    // Invalida le liste che mostrano opportunità
    revalidatePath('/opportunities');
    revalidatePath('/feed');
    revalidatePath('/my/opportunities');

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
