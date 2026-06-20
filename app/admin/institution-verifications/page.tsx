'use client';

import { useEffect, useMemo, useState } from 'react';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  submitted: 'In valutazione',
  approved: 'Approvata',
  rejected: 'Rifiutata',
};

type Row = {
  id: string;
  institution_id: string;
  entity_type: string | null;
  entity_name: string | null;
  fiscal_code: string | null;
  vat_number: string | null;
  email: string | null;
  pec: string | null;
  website: string | null;
  representative: string | null;
  document_type: string | null;
  status: string;
  submitted_at: string | null;
  verified_until: string | null;
  created_at: string | null;
  rejection_reason?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function documentLabel(value?: string | null) {
  return value === 'ade_certificate' ? 'Certificato P.IVA o CF rilasciato da AdE' : value === 'visura' ? 'Visura' : '—';
}

export default function AdminInstitutionVerificationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'approved' | 'rejected' | 'draft'>('submitted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectState, setRejectState] = useState<{ id: string | null; reason: string }>({ id: null, reason: '' });

  const load = async (status: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/institution-verifications?status=${encodeURIComponent(status)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? 'Non autorizzato o errore di caricamento');
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((json?.data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    void load(statusFilter);
  }, [statusFilter]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => (a.entity_name ?? '').localeCompare(b.entity_name ?? '', 'it')), [rows]);

  const openPdf = async (id: string) => {
    setActionId(id);
    const res = await fetch(`/api/admin/institution-verifications/${id}/pdf`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) setError(json?.error ?? 'Impossibile generare il link al PDF');
    else window.open(json.url as string, '_blank', 'noopener,noreferrer');
    setActionId(null);
  };

  const approve = async (id: string) => {
    setActionId(id);
    setError(null);
    const res = await fetch(`/api/admin/institution-verifications/${id}/approve`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json?.error ?? 'Errore durante l’approvazione');
    else await load(statusFilter);
    setActionId(null);
  };

  const reject = async () => {
    if (!rejectState.id) return;
    setActionId(rejectState.id);
    setError(null);
    const res = await fetch(`/api/admin/institution-verifications/${rejectState.id}/reject`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: rejectState.reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json?.error ?? 'Errore durante il rifiuto');
    else {
      setRejectState({ id: null, reason: '' });
      await load(statusFilter);
    }
    setActionId(null);
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="heading-h2 mb-4 text-2xl font-bold">Verifiche Enti</h1>
      <p className="mb-6 text-sm text-neutral-600">Gestisci le richieste inviate dagli Enti Istituzionali.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-700">
          Stato
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="ml-2 rounded-md border px-2 py-1 text-sm">
            <option value="submitted">In valutazione</option>
            <option value="approved">Approvate</option>
            <option value="rejected">Rifiutate</option>
            <option value="draft">Bozze</option>
          </select>
        </label>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Caricamento…</div>
      ) : sortedRows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Nessuna richiesta trovata.</div>
      ) : (
        <div className="space-y-4">
          {sortedRows.map((row) => (
            <section key={row.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">{row.entity_type || 'Ente'}</div>
                  <h2 className="text-lg font-semibold text-slate-900">{row.entity_name || row.institution_id}</h2>
                  <div className="mt-1 text-xs text-slate-500">Richiesta: {formatDate(row.submitted_at ?? row.created_at)}</div>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{STATUS_LABELS[row.status] ?? row.status}</span>
              </div>
              <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                <div><dt className="font-semibold">CF</dt><dd>{row.fiscal_code || '—'}</dd></div>
                <div><dt className="font-semibold">P.IVA</dt><dd>{row.vat_number || '—'}</dd></div>
                <div><dt className="font-semibold">Email</dt><dd>{row.email || '—'}</dd></div>
                <div><dt className="font-semibold">PEC</dt><dd>{row.pec || '—'}</dd></div>
                <div><dt className="font-semibold">Sito</dt><dd>{row.website || '—'}</dd></div>
                <div><dt className="font-semibold">Referente</dt><dd>{row.representative || '—'}</dd></div>
                <div><dt className="font-semibold">Documento</dt><dd>{documentLabel(row.document_type)}</dd></div>
                <div><dt className="font-semibold">Verificato fino al</dt><dd>{formatDate(row.verified_until)}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => openPdf(row.id)} disabled={actionId === row.id} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Apri PDF</button>
                <button type="button" onClick={() => approve(row.id)} disabled={actionId === row.id} className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:brightness-110">Approva</button>
                <button type="button" onClick={() => setRejectState({ id: row.id, reason: '' })} disabled={actionId === row.id} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">Rifiuta</button>
              </div>
              {rejectState.id === row.id ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <label className="block text-xs font-semibold text-rose-700">Motivo rifiuto</label>
                  <textarea value={rejectState.reason} onChange={(e) => setRejectState({ id: row.id, reason: e.target.value })} rows={3} className="mt-2 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={reject} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Conferma rifiuto</button>
                    <button type="button" onClick={() => setRejectState({ id: null, reason: '' })} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Annulla</button>
                  </div>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
