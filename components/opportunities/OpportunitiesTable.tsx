'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Opportunity } from '@/types/opportunity';

type Props = {
  items: Opportunity[];
  currentUserId?: string | null;
  currentUserRole?: 'athlete' | 'club' | 'guest';
  onEdit?: (o: Opportunity) => void;
  onDelete?: (o: Opportunity) => void;
};

export default function OpportunitiesTable({
  items,
  currentUserId,
  currentUserRole = 'guest',
  onEdit,
  onDelete,
}: Props) {
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  async function apply(o: Opportunity) {
    const note = noteById[o.id] || '';
    const res = await fetch(`/api/opportunities/${o.id}/apply2`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const t = await res.text();
      try { const j = JSON.parse(t); alert(j.error || t); }
      catch { alert(t); }
      return;
    }
    setNoteById((s) => ({ ...s, [o.id]: '' }));
  }

  const isAthlete = currentUserRole === 'athlete';
  const isClub = currentUserRole === 'club';

  return (
    <div className="w-full overflow-x-auto rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">Titolo</th>
            <th className="px-4 py-3 text-left">Luogo</th>
            <th className="px-4 py-3 text-left">Sport</th>
            <th className="px-4 py-3 text-left">Ruolo</th>
            <th className="px-4 py-3 text-left">Età</th>
            <th className="px-4 py-3 text-left">Creato</th>
            <th className="px-4 py-3 text-left">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="px-4 py-3">
                <Link href={`/opportunities/${o.id}`} className="underline hover:no-underline">
                  {o.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                {[o.city, o.province, o.region, o.country].filter(Boolean).join(', ') || '—'}
              </td>
              <td className="px-4 py-3">{o.sport || '—'}</td>
              <td className="px-4 py-3">{o.role || '—'}</td>
              <td className="px-4 py-3">{o.age || '—'}</td>
              <td className="px-4 py-3">
                {o.created_at
                  ? new Date(o.created_at).toLocaleString()
                  : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {/* Campo nota + pulsante Candidati SOLO per atleti */}
                  {isAthlete && (
                    <>
                      <input
                        className="rounded-lg border px-2 py-1"
                        placeholder="Nota (opzionale)"
                        value={noteById[o.id] ?? ''}
                        onChange={(e) =>
                          setNoteById((s) => ({ ...s, [o.id]: e.target.value }))
                        }
                      />
                      <button
                        onClick={() => apply(o)}
                        className="px-3 py-1 rounded-lg bg-gray-900 text-white"
                      >
                        Candidati
                      </button>
                    </>
                  )}

                  {/* Azioni di gestione visibili al proprietario (club che ha creato l’annuncio) */}
                  {isClub && o.owner_id === currentUserId && (
                    <>
                      <button
                        onClick={() => onEdit?.(o)}
                        className="px-3 py-1 rounded-lg border"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => onDelete?.(o)}
                        className="px-3 py-1 rounded-lg border"
                      >
                        Elimina
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                Nessuna opportunità trovata.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
