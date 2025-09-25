import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_KEY = 'followed_ids';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 anno

async function readFollowedIds(): Promise<string[]> {
  try {
    const store = await cookies(); // 👈 in questo progetto è Promise<ReadonlyRequestCookies>
    const v = store.get(COOKIE_KEY)?.value ?? '[]';
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeFollowedIds(ids: string[]): Promise<void> {
  const store = await cookies(); // 👈 serve await anche qui
  store.set(COOKIE_KEY, JSON.stringify(ids), {
    path: '/',
    httpOnly: false, // lato client leggibile (stub)
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function GET() {
  const ids = await readFollowedIds();
  return NextResponse.json({ ids });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = (body?.id ?? '').toString().trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    const current = new Set(await readFollowedIds());
    let following = false;

    if (current.has(id)) {
      current.delete(id);
      following = false;
    } else {
      current.add(id);
      following = true;
    }

    const updated = Array.from(current);
    await writeFollowedIds(updated);

    return NextResponse.json({ ok: true, following, ids: updated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
