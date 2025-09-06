import type { Club } from '@/types/club';

export default function ClubsTable({
  items,
  currentUserId,
  onEdit,
  onDelete,
}: {
  items: Club[];
  currentUserId?: string | null;
  onEdit?: (club: Club) => void;
  onDelete?: (club: Club) => void;
}) {
  if (!items.length) {
    return <div className="text-sm text-gray-500 py-8">Nessun club trovato. Prova a cambiare i filtri.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2">Club</th>
            <th className="px-4 py-2">Città</th>
            <th className="px-4 py-2">Paese</th>
            <th className="px-4 py-2">Livello</th>
            <th className="px-4 py-2">Creato</th>
            <th className="px-4 py-2 w-32">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const canEdit = !!currentUserId && c.owner_id === currentUserId;
            return (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 flex items-center gap-3">
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                  )}
                  <span className="font-medium">{c.display_name || c.name}</span>
                </td>
                <td className="px-4 py-2">{c.city ?? '—'}</td>
                <td className="px-4 py-2">{c.country ?? '—'}</td>
                <td className="px-4 py-2">{c.level ?? '—'}</td>
                <td className="px-4 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit?.(c)} className="px-2 py-1 rounded border hover:bg-gray-50">Modifica</button>
                      <button onClick={() => onDelete?.(c)} className="px-2 py-1 rounded border hover:bg-red-50">Elimina</button>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
