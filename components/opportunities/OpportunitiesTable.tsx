'use client';

import { useEffect, useState } from 'react';
import type { Opportunity } from '@/types/opportunity';

function formatBracket(min: number | null, max: number | null) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function ApplyCell({ opportunityId }: { opportunityId: string }) {
  const [meType, setMeType] = useState<'athlete' | 'club' | null>(null);
  const [note, setNote] = useState('');
  const [applied, setApplied] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json()).then(j => setMeType(j?.data?.type ?? null)).catch(() => setMeType(null));
    fetch(`/api/applications/exists?opportunityId=${opportunityId}`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : { applied: false })
      .then(j => setApplied(!!j.applied))
      .catch(() => setApplied(false));
  }, [opportunityId]);

  const apply = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setApplied(true);
    } catch (e: any) {
      alert(e.message || 'Errore candidatura');
    } finally {
      setPending(false);
    }
  };

  if (meType === 'club') {
    return <span className="text-xs px-2 py-1 border rounded-lg text-gray-600 bg-gray-50">Solo atleti</span>;
  }

  if (applied) {
    return <span className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-800">Candidatura inviata</span>;
  }

  if (meType !== 'athlete') {
    return <span className="text-xs px-2 py-1 border rounded-lg text-gray-400">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        placeholder="Nota (opzionale)"
        className="px-2 py-1 border rounded-lg"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button
        disabled={pending}
        onClick={apply}
        className="px-3 py-1 rounded-lg bg-gray-900 text-white disabled:opacity-50"
      >
        Candidati
      </button>
    </div>
  );
}

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
            <th className="px-4 py-2">Luogo</th>
            <th className="px-4 py-2">Sport</th>
            <th className="px-4 py-2">Ruolo</th>
            <th className="px-4 py-2">Età</th>
            <th className="px-4 py-2">Club</th>
            <th className="px-4 py-2">Creato</th>
            <th className="px-4 py-2 w-[280px]">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const canEdit = !!currentUserId && o.created_by === currentUserId;
            const place = [o.city, o.province, o.region, o.country].filter(Boolean).join(', ');
            return (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-medium">{o.title}</td>
                <td className="px-4 py-2 text-gray-600">{place || '—'}</td>
                <td className="px-4 py-2">{o.sport ?? '—'}</td>
                <td className="px-4 py-2">{o.role ?? '—'}</td>
                <td className="px-4 py-2">{formatBracket(o.age_min, o.age_max)}</td>
                <td className="px-4 py-2">{o.club_name ?? '—'}</td>
                <td className="px-4 py-2">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit?.(o)} className="px-2 py-1 rounded border hover:bg-gray-50">Modifica</button>
                      <button onClick={() => onDelete?.(o)} className="px-2 py-1 rounded border hover:bg-red-50">Elimina</button>
                    </div>
                  ) : (
                    <ApplyCell opportunityId={o.id} />
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
