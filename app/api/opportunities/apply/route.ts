import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const COOKIE_APPLIED_KEY = 'applied_opps';
const COOKIE_APPS_KEY = 'applications_store_v1';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 anno

type ApplicationsCookie = {
  applications: Array<{
    id: string;        // application id
    oppId: string;
    oppTitle?: string;
    clubId?: string;
    clubName?: string;
    athleteId?: string;
    athleteName?: string;
    createdAt: string; // ISO
    note?: string;     // C3
  }>;
};

async function readAppliedIds(): Promise<string[]> {
  try {
    const store = await cookies();
    const v = store.get(COOKIE_APPLIED_KEY)?.value ?? '[]';
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeAppliedIds(ids: string[]) {
  const store = await cookies();
  store.set(COOKIE_APPLIED_KEY, JSON.stringify(ids), {
    path: '/',
    httpOnly: false, // leggibile dal client (stub)
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

async function readApplications(): Promise<ApplicationsCookie> {
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

async function writeApplications(data: ApplicationsCookie) {
  const store = await cookies();
  store.set(COOKIE_APPS_KEY, JSON.stringify(data), {
    path: '/',
    httpOnly: true,   // solo server-side
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function GET() {
  const ids = await readAppliedIds();
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = (body?.id ?? '').toString().trim();
    const action = (body?.action ?? '').toString().trim(); // 'apply' | 'unapply' | ''
    const meta = (body?.meta ?? {}) as {
      oppTitle?: string;
      clubId?: string;
      clubName?: string;
    };

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    }

    // Stato atleta
    const current = new Set(await readAppliedIds());
    let applied: boolean;

    if (action === 'apply') {
      current.add(id);
      applied = true;
    } else if (action === 'unapply') {
      current.delete(id);
      applied = false;
    } else {
      if (current.has(id)) {
        current.delete(id);
        applied = false;
      } else {
        current.add(id);
        applied = true;
      }
    }

    const updatedIds = Array.from(current);
    await writeAppliedIds(updatedIds);

    // Store candidature (solo quando applied = true o quando togliamo)
    const store = await readApplications();

    // Chi è l'atleta? Proviamo a leggerlo dall'endpoint stub me
    let athleteId = 'ath-guest';
    let athleteName = 'Utente';
    try {
      const meRes = await fetch(new URL('/api/athletes/me', req.url), {
        headers: { cookie: req.headers.get('cookie') || '' },
        cache: 'no-store',
      });
      if (meRes.ok) {
        const mj = await meRes.json().catch(() => ({}));
        if (mj?.athlete?.id) athleteId = String(mj.athlete.id);
        if (mj?.athlete?.name) athleteName = String(mj.athlete.name);
      }
    } catch {
      // ignore
    }

    if (applied) {
      // Se non esiste già applicazione per (oppId, athleteId), creala
      const exists = store.applications.some((a) => a.oppId === id && a.athleteId === athleteId);
      if (!exists) {
        store.applications.unshift({
          id: `app_${Date.now()}`, // semplice id
          oppId: id,
          oppTitle: meta?.oppTitle,
          clubId: meta?.clubId,
          clubName: meta?.clubName,
          athleteId,
          athleteName,
          createdAt: new Date().toISOString(),
        });
        // mantieni dimensione ragionevole
        store.applications = store.applications.slice(0, 200);
      }
    } else {
      // rimuovi eventuali applicazioni per quell'opportunità di questo atleta
      store.applications = store.applications.filter(
        (a) => !(a.oppId === id && a.athleteId === athleteId),
      );
    }

    await writeApplications(store);

    return NextResponse.json({ ok: true, applied, ids: updatedIds });
  } catch {
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
