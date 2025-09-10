// app/applications/sent/page.tsx
export const dynamic = 'force-dynamic';

import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Role = 'athlete' | 'club' | null;

async function getRoleFromSupabase(): Promise<Role> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return null;

    const { data: prof } = await supabase
      .from('profiles')
      .select('profile_type, type')
      .eq('id', u.user.id)
      .maybeSingle();

    const t = (
      (prof as any)?.profile_type ??
      (prof as any)?.type ??
      ''
    ).toString().toLowerCase();

    if (t.includes('club')) return 'club';
    if (t.includes('atlet')) return 'athlete';
    return null;
  } catch {
    return null;
  }
}

async function fetchSentRows() {
  try {
    const cookieHeader = (await cookies()).toString();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
    const res = await fetch(`${base}/api/applications/mine`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({} as any));
    const rows =
      (Array.isArray(data) && data) ||
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.data) && data.data) ||
      [];
    return rows;
  } catch {
    return [];
  }
}

export default async function SentApplicationsPage() {
  const [role, rows] = await Promise.all([getRoleFromSupabase(), fetchSentRows()]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Candidature inviate</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sei loggato come <b>{role ?? 'non loggato'}</b>.
      </p>
      {role === 'club' ? (
        <div className="mb-3 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
          Stai visualizzando come <b>Club</b>. Le candidature inviate sono visibili quando sei un <b>Atleta</b>.
        </div>
      ) : null}
      <ApplicationsTable rows={rows} kind="sent" />
    </div>
  );
}
