import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_KEY = 'applied_opps';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 anno

async function readAppliedIds(): Promise<string[]> {
  try {
    const store = await cookies(); // Next 15 in questo progetto è async
    const v = store.get(COOKIE_KEY)?.value ?? '[]';
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeAppliedIds(ids: string[]): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_KEY, JSON.stringify(ids), {
    path: '/',
    httpOnly: false, // leggibile client-side (stub)
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function GET() {
  const ids = await readAppliedIds();
  return NextResponse.json({ ids });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = (body?.id ?? '').toString().trim();
    const action = (body?.action ?? '').toString().trim(); // 'apply' | 'unapply' | ''

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    const current = new Set(await readAppliedIds());
    let applied: boolean;

    if (action === 'apply') {
      current.add(id);
      applied = true;
    } else if (action === 'unapply') {
      current.delete(id);
      applied = false;
    } else {
      // toggle
      if (current.has(id)) {
        current.delete(id);
        applied = false;
      } else {
        current.add(id);
        applied = true;
      }
    }

    const updated = Array.from(current);
    await writeAppliedIds(updated);
    return NextResponse.json({ ok: true, applied, ids: updated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
