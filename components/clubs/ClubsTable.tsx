// components/clubs/ClubsTable.tsx
import Image from 'next/image';
import type { Club } from '@/types/club';

export default function ClubsTable({
  items,
  currentUserId,
  readOnly = false,
  onEdit,
  onDelete,
}: {
  items: Club[];
  currentUserId?: string | null;
  /** Se true, nasconde del tutto la colonna Azioni */
  readOnly?: boolean;
  onEdit?: (club: Club) => void;
  onDelete?: (club: Club) => void;
}) {
  if (!items.length) {
    return (
      <div className="text-sm text-gray-500 py-8">
        Nessun club trovato. Prova a cambiare i filtri.
      </div>
    );
  }

  // Mostriamo la colonna Azioni solo se NON readOnly e c’è almeno una action possibile
  const showActions = !readOnly && (!!onEdit || !!onDelete);

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
            {showActions && <th className="px-4 py-2 w-32">Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const canEdit = showActions && !!currentUserId && c.owner_id === currentUserId;
            const created = c.created_at ? new Date(c.created_at).toLocaleDateString() : '—';
            return (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 flex items-center gap-3">
                  {c.logo_url ? (
                    <Image
                      src={c.logo_url}
                      alt={c.name}
                      width={32}
                      height={32}
                      sizes="32px"
                      loading="lazy"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                  )}
                  <span className="font-medium">{(c as any).displayLabel ?? c.display_name ?? c.name}</span>
                </td>
                <td className="px-4 py-2">{c.city ?? '—'}</td>
                <td className="px-4 py-2">{c.country ?? '—'}</td>
                <td className="px-4 py-2">{c.level ?? '—'}</td>
                <td className="px-4 py-2">{created}</td>
                {showActions && (
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(c)}
                            className="px-2 py-1 rounded border hover:bg-gray-50"
                          >
                            Modifica
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(c)}
                            className="px-2 py-1 rounded border hover:bg-red-50"
                          >
                            Elimina
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
