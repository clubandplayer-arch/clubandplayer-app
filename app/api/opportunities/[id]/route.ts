import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
// ...i tuoi import

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    // ...update su DB di params.id

    revalidatePath('/opportunities');
    revalidatePath('/feed');
    revalidatePath('/my/opportunities');

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
