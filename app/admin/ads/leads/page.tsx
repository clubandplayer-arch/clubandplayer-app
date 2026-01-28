'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type LeadRow = {
  id: string;
  created_at: string | null;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  location: string | null;
  budget: string | null;
  message: string;
  status: string;
  notes: string | null;
  source: string | null;
};

const STATUS_OPTIONS: Array<'new' | 'contacted' | 'closed'> = ['new', 'contacted', 'closed'];
const STATUS_LABELS: Record<string, string> = {
  new: 'Nuovo',
  contacted: 'Contattato',
  closed: 'Chiuso',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function AdminAdsLeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const selectedLead = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/ads/leads', { cache: 'no-store' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Non autorizzato o errore di caricamento');
      setRows([]);
      setLoading(false);
      return;
    }
    const j = await res.json().catch(() => ({}));
    const data = (j?.data as LeadRow[]) ?? [];
    setRows(data);
    if (data.length && !selectedId) {
      setSelectedId(data[0].id);
      setNotesDraft(data[0].notes ?? '');
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedLead) return;
    setNotesDraft(selectedLead.notes ?? '');
  }, [selectedLead]);

  const updateLead = async (id: string, payload: { status?: string; notes?: string | null }) => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/ads/leads/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante il salvataggio');
      setSaving(false);
      return;
    }

    const j = await res.json().catch(() => ({}));
    const updated = j?.data as LeadRow | undefined;
    if (updated) {
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    }
    setSaving(false);
  };

  const onStatusChange = (status: 'new' | 'contacted' | 'closed') => {
    if (!selectedLead) return;
    void updateLead(selectedLead.id, { status });
  };

  const onNotesSave = () => {
    if (!selectedLead) return;
    void updateLead(selectedLead.id, { notes: notesDraft });
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lead sponsor</h1>
          <p className="text-sm text-neutral-600">Gestisci le richieste di sponsorizzazione ricevute.</p>
        </div>
        <Link href="/admin/ads" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          ← Torna ad Ads
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Data</th>
                <th className="px-4 py-3 text-left font-semibold">Azienda</th>
                <th className="px-4 py-3 text-left font-semibold">Nome</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Telefono</th>
                <th className="px-4 py-3 text-left font-semibold">Area</th>
                <th className="px-4 py-3 text-left font-semibold">Budget</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-neutral-500" colSpan={9}>
                    Caricamento lead...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-neutral-500" colSpan={9}>
                    Nessun lead disponibile.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.id === selectedId ? 'bg-slate-50' : undefined}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.phone ?? '—'}</td>
                  <td className="px-4 py-3">{row.location ?? '—'}</td>
                  <td className="px-4 py-3">{row.budget ?? '—'}</td>
                  <td className="px-4 py-3">{STATUS_LABELS[row.status] ?? row.status}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(row.id);
                      }}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Dettagli
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Dettaglio lead</h2>
          {!selectedLead && <p className="mt-3 text-sm text-neutral-500">Seleziona un lead dalla tabella.</p>}
          {selectedLead && (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase text-neutral-500">Messaggio</p>
                <p className="mt-1 whitespace-pre-line text-neutral-800">{selectedLead.message}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Status</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onStatusChange(status)}
                      disabled={saving}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        selectedLead.status === status
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:border-slate-400'
                      } disabled:opacity-60`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Note interne</p>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Annotazioni interne per il team ads"
                />
                <button
                  type="button"
                  onClick={onNotesSave}
                  disabled={saving}
                  className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Salva note
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
