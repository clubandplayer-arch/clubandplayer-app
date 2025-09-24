import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_APPS_KEY = 'applications_store_v1';

type Application = {
  id: string;
  oppId: string;
  oppTitle?: string;
  clubId?: string;
  clubName?: string;
  athleteId?: string;
  athleteName?: string;
  createdAt: string;
  note?: string;
};

async function readApplications(): Promise<Application[]> {
  try {
    const store = await cookies();
    const raw = store.get(COOKIE_APPS_KEY)?.value ?? '';
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.applications) ? parsed.applications : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  // Individua il club “me” (stub) via API già presente
  let clubId: string | null = null;
  try {
    const meRes = await fetch(new URL('/api/clubs/me', req.url), {
      headers: { cookie: req.headers.get('cookie') || '' },
      cache: 'no-store',
    });
    if (meRes.ok) {
      const mj = await meRes.json().catch(() => ({}));
      clubId = mj?.club?.id ? String(mj.club.id) : null;
    }
  } catch {
    clubId = null;
  }

  const all = await readApplications();
  const items = clubId ? all.filter((a) => a.clubId === clubId) : [];

  // Ordina dal più recente
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ items });
}
