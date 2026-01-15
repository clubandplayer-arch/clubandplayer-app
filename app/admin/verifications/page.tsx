'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  submitted: 'In valutazione',
  approved: 'Approvata',
  rejected: 'Rifiutata',
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Non pagato',
  paid: 'Pagato',
  waived: 'Esente',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PAYMENT_TONE: Record<string, string> = {
  unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  waived: 'bg-slate-100 text-slate-700 border-slate-200',
};

type VerificationRow = {
  id: string;
  club_id: string;
  status: string;
  submitted_at: string | null;
  payment_status: string | null;
  verified_until: string | null;
  created_at: string | null;
};

type ClubsMap = Record<string, { name: string | null }>;

type RejectState = {
  id: string | null;
  reason: string;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [clubs, setClubs] = useState<ClubsMap>({});
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'approved' | 'rejected' | 'draft'>('submitted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectState, setRejectState] = useState<RejectState>({ id: null, reason: '' });

  const load = async (status: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/verifications?status=${encodeURIComponent(status)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? 'Non autorizzato o errore di caricamento');
      setRows([]);
      setClubs({});
      setLoading(false);
      return;
    }
    setRows((json?.data ?? []) as VerificationRow[]);
    setClubs((json?.clubs ?? {}) as ClubsMap);
    setLoading(false);
  };

  useEffect(() => {
    void load(statusFilter);
  }, [statusFilter]);

  const openPdf = async (id: string) => {
    setActionId(id);
    const res = await fetch(`/api/admin/verifications/${id}/pdf`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) {
      setError(json?.error ?? 'Impossibile generare il link al PDF');
      setActionId(null);
      return;
    }
    window.open(json.url as string, '_blank', 'noopener,noreferrer');
    setActionId(null);
  };

  const markPaid = async (id: string) => {
    setActionId(id);
    setError(null);
    const res = await fetch(`/api/admin/verifications/${id}/mark-paid`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? 'Errore durante il salvataggio');
      setActionId(null);
      return;
    }
    await load(statusFilter);
    setActionId(null);
  };

  const approve = async (id: string) => {
    setActionId(id);
    setError(null);
    const res = await fetch(`/api/admin/verifications/${id}/approve`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? 'Errore durante l\'approvazione');
      setActionId(null);
      return;
    }
    await load(statusFilter);
    setActionId(null);
  };

  const submitReject = async () => {
    if (!rejectState.id) return;
    setActionId(rejectState.id);
    setError(null);
    const res = await fetch(`/api/admin/verifications/${rejectState.id}/reject`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: rejectState.reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? 'Errore durante il rifiuto');
      setActionId(null);
      return;
    }
    setRejectState({ id: null, reason: '' });
    await load(statusFilter);
    setActionId(null);
  };

  const rowsWithClub = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      clubName: clubs[row.club_id]?.name ?? null,
    }));
  }, [rows, clubs]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="heading-h2 mb-4 text-2xl font-bold">Verifiche club</h1>
      <p className="mb-6 text-sm text-neutral-600">Gestisci le richieste di verifica inviate dai club.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-700">
          Stato
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="ml-2 rounded-md border px-2 py-1 text-sm"
          >
            <option value="submitted">In valutazione</option>
            <option value="approved">Approvate</option>
            <option value="rejected">Rifiutate</option>
            <option value="draft">Bozze</option>
          </select>
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Caricamento…</div>
      ) : (
        <div className="space-y-4">
          {rowsWithClub.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Nessuna richiesta trovata.
            </div>
          ) : (
            rowsWithClub.map((row) => {
              const statusTone = STATUS_TONE[row.status] ?? STATUS_TONE.draft;
              const paymentTone = PAYMENT_TONE[row.payment_status ?? 'unpaid'] ?? PAYMENT_TONE.unpaid;
              return (
                <div key={row.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Club</div>
                      <Link href={`/clubs/${row.club_id}`} className="text-base font-semibold text-slate-900">
                        {row.clubName ?? row.club_id}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">Richiesta: {formatDate(row.submitted_at ?? row.created_at)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${paymentTone}`}>
                        {PAYMENT_LABELS[row.payment_status ?? 'unpaid'] ?? row.payment_status}
                      </span>
                      {row.verified_until && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          Verificato fino al {formatDate(row.verified_until)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openPdf(row.id)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      disabled={actionId === row.id}
                    >
                      Apri PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => markPaid(row.id)}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      disabled={actionId === row.id}
                    >
                      Segna pagato
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(row.id)}
                      className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      disabled={actionId === row.id}
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectState({ id: row.id, reason: '' })}
                      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      disabled={actionId === row.id}
                    >
                      Rifiuta
                    </button>
                  </div>

                  {rejectState.id === row.id && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <label className="block text-xs font-semibold text-rose-700">Motivo rifiuto</label>
                      <textarea
                        value={rejectState.reason}
                        onChange={(e) => setRejectState({ id: row.id, reason: e.target.value })}
                        rows={3}
                        className="mt-2 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-rose-900"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={submitReject}
                          className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                          disabled={actionId === row.id}
                        >
                          Conferma rifiuto
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectState({ id: null, reason: '' })}
                          className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}
