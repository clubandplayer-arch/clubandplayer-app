import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_APPS_KEY = 'applications_store_v1';

type ApplicationsCookie = {
  applications: Array<{
    id: string;
    oppId: string;
    oppTitle?: string;
    clubId?: string;
    clubName?: string;
    athleteId?: string;
    athleteName?: string;
    createdAt: string;
    note?: string;
  }>;
};

async function readApps(): Promise<ApplicationsCookie> {
  try {
    const store = await cookies();
    const raw = store.get(COOKIE_APPS_KEY)?.value ?? '';
    if (!raw) return { applications: [] };
    const parsed = JSON.parse(raw);
    const applications = Array.isArray(parsed?.applications) ? parsed.applications : [];
    return { applications };
  } catch {
    return { applications: [] };
  }
}

async function writeApps(data: ApplicationsCookie) {
  const store = await cookies();
  store.set(COOKIE_APPS_KEY, JSON.stringify(data), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const applicationId = (body?.applicationId ?? '').toString().trim();
    const note = typeof body?.note === 'string' ? body.note : '';

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const store = await readApps();
    const idx = store.applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }

    store.applications[idx] = { ...store.applications[idx], note };
    await writeApps(store);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
