// app/applications/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies, headers as nextHeaders } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Role = 'athlete' | 'club' | null;

async function detectRoleReceived(): Promise<Role> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return null;
    const uid = u.user.id;

    const { data: prof } = await supabase
      .from('profiles')
      .select('type, profile_type, id, user_id')
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    const t = (
      (prof as any)?.type ??
      (prof as any)?.profile_type ??
      ''
    ).toString().toLowerCase();

    if (t.includes('club')) return 'club';
    if (t.includes('atlet')) return 'athlete';

    // Fallback: se ha opportunità pubblicate → è club
    const { count: opps } = await supabase
      .from('opportunities')
      .select('id', { head: true, count: 'exact' })
      .eq('owner_id', uid);

    if ((opps ?? 0) > 0) return 'club';

    // Fallback secondario: se ha candidature inviate → atleta
    const { count: sent } = await supabase
      .from('applications')
      .select('id', { head: true, count: 'exact' })
      .eq('athlete_id', uid);

    if ((sent ?? 0) > 0) return 'athlete';

    return null;
  } catch {
    return null;
  }
}

function getOriginFromHeaders(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  return `${proto}://${host}`;
}

async function cookieHeader(): Promise<string> {
  const ck = await cookies();
  return ck.getAll().map(c => `${c.name}=${c.value}`).join('; ');
}

async function fetchReceivedRows() {
  try {
    const h = await nextHeaders();
    const origin = getOriginFromHeaders(h);
    const base = process.env.NEXT_PUBLIC_BASE_URL || origin;

    const res = await fetch(`${base}/api/applications/received`, {
      cache: 'no-store',
      headers: { cookie: await cookieHeader() },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({} as any));
    return (Array.isArray(data) && data)
      || (Array.isArray(data.items) && data.items)
      || (Array.isArray(data.data) && data.data)
      || [];
  } catch {
    return [];
  }
}

export default async function ReceivedApplicationsPage() {
  const [role, rows] = await Promise.all([detectRoleReceived(), fetchReceivedRows()]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Candidature ricevute</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sei loggato come <b>{role ?? 'non loggato'}</b>.
      </p>
      {role === 'athlete' ? (
        <div className="mb-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
          Stai visualizzando come <b>Atleta</b>. Le candidature ricevute sono per i <b>Club</b>.
        </div>
      ) : null}
      <ApplicationsTable rows={rows} kind="received" />
    </div>
  );
}