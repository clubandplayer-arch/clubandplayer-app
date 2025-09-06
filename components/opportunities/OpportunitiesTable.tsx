import type { Opportunity } from '@/types/opportunity';

export default function OpportunitiesTable({
  items,
  currentUserId,
  onEdit,
  onDelete,
}: {
  items: Opportunity[];
  currentUserId?: string | null;
  onEdit?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
}) {
  if (!items.length) {
    return <div className="text-sm text-gray-500 py-8">Nessuna opportunità trovata. Prova a rimuovere i filtri.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2">Titolo</th>
            <th className="px-4 py-2">Descrizione</th>
            <th className="px-4 py-2">Creato</th>
            <th className="px-4 py-2 w-32">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const canEdit = !!currentUserId && o.created_by === currentUserId;
            return (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-medium">{o.title}</td>
                <td className="px-4 py-2 text-gray-600">{o.description ?? '—'}</td>
                <td className="px-4 py-2">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit?.(o)} className="px-2 py-1 rounded border hover:bg-gray-50">Modifica</button>
                      <button onClick={() => onDelete?.(o)} className="px-2 py-1 rounded border hover:bg-red-50">Elimina</button>
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
