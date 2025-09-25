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
      <h1 className="mb-3 text-xl font-semibold">I miei annunci</h1>
      <p className="mb-6 text-gray-600">Qui trovi tutti gli annunci creati dal tuo club.</p>

      {!ops?.length && (
        <div className="rounded-lg border p-8 text-center text-gray-500">
          Non hai ancora creato annunci.{' '}
          <a className="text-blue-700 hover:underline" href="/club/post">
            Crea il primo
          </a>
          .
        </div>
      )}

      {!!ops?.length && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Titolo</th>
                <th className="px-3 py-2 text-left">Località</th>
                <th className="px-3 py-2 text-left">Creazione</th>
                <th className="px-3 py-2 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.title ?? '—'}</td>
                  <td className="px-3 py-2">
                    {[o.city, o.province, o.region, o.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <a
                        className="rounded-md border px-2 py-1 hover:bg-gray-50"
                        href={`/opportunities/${o.id}`}
                      >
                        Apri
                      </a>
                      <a
                        className="rounded-md border px-2 py-1 hover:bg-gray-50"
                        href={`/opportunities/${o.id}/applications`}
                      >
                        Candidature
                      </a>
                      <a
                        className="rounded-md border px-2 py-1 hover:bg-gray-50"
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
