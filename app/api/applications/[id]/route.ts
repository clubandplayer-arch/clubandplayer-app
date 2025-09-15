// app/api/applications/[id]/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
// importa qui i tuoi servizi DB reali, es.
// import { db } from '@/lib/db';

async function revalidateApplications() {
  // Liste generiche
  try {
    revalidatePath('/applications/received');
    revalidatePath('/applications/sent');
    revalidatePath('/my/applications');
    revalidatePath('/club/applicants');

    // La pagina opportunità spesso mostra contatori / azioni
    revalidatePath('/opportunities');
  } catch {
    // no-op in build
  }
}

/**
 * PATCH /api/applications/[id]
 * Body JSON: { status?: 'accepted'|'rejected', note?: string }
 * Next 15: context.params è una Promise
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({} as any));
    const nextStatus: string | undefined = body?.status;
    const note: string | undefined = body?.note;

    // Validazione minimale lato API
    const allowed = new Set(['accepted', 'rejected', 'submitted']);
    if (nextStatus && !allowed.has(nextStatus)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    // 🔧 TODO: qui esegui davvero l'update nel tuo DB:
    // await db.application.update({
    //   where: { id },
    //   data: {
    //     ...(nextStatus ? { status: nextStatus } : {}),
    //     ...(typeof note === 'string' ? { note } : {}),
    //     updated_at: new Date(),
    //   },
    // });

    await revalidateApplications();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/**
 * (Opzionale) GET singola candidatura — comodo per debug o detail view
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // const app = await db.application.findUnique({ where: { id } });
    // if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    // return NextResponse.json(app);

    // Placeholder safe
    return NextResponse.json({ id, status: 'submitted' });
  } catch {
    return NextResponse.json({ error: 'get_failed' }, { status: 500 });
  }
}
