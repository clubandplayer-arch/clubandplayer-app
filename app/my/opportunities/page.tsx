// app/my/opportunities/page.tsx
import { redirect } from 'next/navigation';
import { getUserAndRole } from '@/lib/auth/role';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, role, supabase } = await getUserAndRole();
  if (!user) redirect('/login');

  // Se NON sei un club → vai alle candidature inviate
  if (role !== 'club') {
    redirect('/applications/sent');
  }

  const { data: ops, error } = await supabase
    .from('opportunities')
    .select('id,title,city,province,region,country,created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-3">I miei annunci</h1>
      <p className="text-gray-600 mb-6">
        Qui trovi tutti gli annunci creati dal tuo club.
      </p>

      {!ops?.length && (
        <div className="border rounded-lg p-8 text-center text-gray-500">
          Non hai ancora creato annunci.{' '}
          <a className="text-blue-700 hover:underline" href="/club/post">
            Crea il primo
          </a>
          .
        </div>
      )}

      {!!ops?.length && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Titolo</th>
                <th className="text-left px-3 py-2">Località</th>
                <th className="text-left px-3 py-2">Creazione</th>
                <th className="text-left px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.title ?? '—'}</td>
                  <td className="px-3 py-2">
                    {[o.city, o.province, o.region, o.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <a
                        className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        href={`/opportunities/${o.id}`}
                      >
                        Apri
                      </a>
                      <a
                        className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        href={`/opportunities/${o.id}/applications`}
                      >
                        Candidature
                      </a>
                      <a
                        className="px-2 py-1 border rounded-md hover:bg-gray-50"
                        href={`/club/post/edit/${o.id}`}
                      >
                        Modifica
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
