import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
// ...i tuoi import reali (DB, ecc.)

/**
 * Se devi revalidare più percorsi, centralizziamo qui.
 * Non è obbligatorio aspettare, ma lo facciamo per evitare warning.
 */
async function revalidateAll() {
  try {
    revalidatePath('/opportunities');
    revalidatePath('/feed');
    revalidatePath('/my/opportunities');
  } catch {
    // no-op in build
  }
}

/**
 * PATCH /api/opportunities/[id]
 * Firma aggiornata per Next 15:
 * - req: NextRequest
 * - context.params è una Promise => va await-ata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    // ...update su DB di "id" con "body"
    // es: await db.opportunity.update({ where: { id }, data: body });

    await revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/**
 * Se in questo file usi anche DELETE o GET, lascia qui degli stub pronti
 * (puoi collegarli alla tua logica reale). Se non ti servono, puoi rimuoverli.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // ...delete su DB di "id"
    // es: await db.opportunity.delete({ where: { id } });

    await revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // ...fetch su DB di "id"
    // es: const opp = await db.opportunity.findUnique({ where: { id } });
    // return NextResponse.json(opp);

    // placeholder safe: evita errori di build finché colleghi il DB
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: 'get_failed' }, { status: 500 });
  }
}
