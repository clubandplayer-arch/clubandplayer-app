export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies, headers as nextHeaders } from 'next/headers';

type Row = {
  id: string;
  title: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
  created_at?: string | null;
  applications_count?: {
    total: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
};

function getOriginFromHeaders(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  return `${proto}://${host}`;
}

async function cookieHeader(): Promise<string> {
  const ck = await cookies();
  return ck.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

async function fetchMine(): Promise<Row[]> {
  const h = await nextHeaders();
  const origin = getOriginFromHeaders(h);
  const base = process.env.NEXT_PUBLIC_BASE_URL || origin;

  const res = await fetch(`${base}/api/opportunities/mine`, {
    cache: 'no-store',
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({}));
  const list = (j?.data ?? j?.items ?? j ?? []) as Row[];
  return Array.isArray(list) ? list : [];
}

export default async function MyOpportunitiesPage() {
  const rows = await fetchMine();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">I miei annunci</h1>
      <p className="text-sm text-gray-600 mb-4">
        Qui trovi tutti gli annunci creati dal tuo club.
      </p>

      {rows.length === 0 ? (
        <div className="border rounded-lg p-10 text-center text-gray-500">
          Non hai ancora creato annunci.{' '}
          <Link href="/club/post" className="text-blue-700 hover:underline">
            Crea il primo
          </Link>
          .
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 whitespace-nowrap w-40">Creato</th>
                <th className="text-left px-3 py-2">Titolo</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Località</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Candidature</th>
                <th className="text-left px-3 py-2 whitespace-nowrap w-56">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const loc = [r.city, r.province, r.region, r.country]
                  .filter(Boolean)
                  .join(', ');
                const c = r.applications_count ?? {
                  total: 0,
                  submitted: 0,
                  accepted: 0,
                  rejected: 0,
                };
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/opportunities/${r.id}`} className="text-blue-700 hover:underline">
                        {r.title ?? r.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{loc || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span title={`pendenti: ${c.submitted}, accettate: ${c.accepted}, rifiutate: ${c.rejected}`}>
                        {c.total} <span className="text-gray-500">({c.submitted} pend.)</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/opportunities/${r.id}/applications`}
                          className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        >
                          Vedi candidature
                        </Link>
                        <Link
                          href={`/opportunities/${r.id}`}
                          className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        >
                          Apri annuncio
                        </Link>
                        <Link
                          href={`/club/post/edit/${r.id}`}
                          className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        >
                          Modifica
                        </Link>
                        {/* TODO: Chiudi/Riapri quando confermiamo il campo status/is_open su opportunities */}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
