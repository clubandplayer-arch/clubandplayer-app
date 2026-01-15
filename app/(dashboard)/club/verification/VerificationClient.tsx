'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

type VerificationRequest = {
  id: string;
  status: string;
  certificate_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  rejection_reason: string | null;
  verified_until: string | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_verified?: boolean | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function extractFileName(path?: string | null) {
  if (!path) return null;
  const parts = path.split('/');
  return parts[parts.length - 1] || null;
}

type DebugInfo = {
  userId: string;
  profileType: string | null;
  clubId: string | null;
};

type Props = {
  isClub: boolean;
  debug?: DebugInfo;
};

export default function VerificationClient({ isClub, debug }: Props) {
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const status = request?.status ?? 'draft';
  const statusLabel = STATUS_LABELS[status] ?? 'Bozza';
  const statusTone = STATUS_TONE[status] ?? STATUS_TONE.draft;

  const paymentStatus = String(request?.payment_status ?? 'unpaid');
  const paymentLabel = PAYMENT_LABELS[paymentStatus] ?? 'Non pagato';
  const isPaymentOk = paymentStatus === 'paid' || paymentStatus === 'waived';

  const canUpload = status === 'draft' || status === 'rejected' || !request;
  const canSubmit = !!request && status === 'draft' && !!request.certificate_path && !submitting;

  const fileName = useMemo(() => {
    return selectedFileName || extractFileName(request?.certificate_path) || null;
  }, [request?.certificate_path, selectedFileName]);

  async function loadRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/club/verification', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Impossibile caricare la richiesta.');
      }
      setRequest(json?.request ?? null);
    } catch (err: any) {
      setError(err?.message || 'Errore nel caricamento della richiesta.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isClub) return;
    void loadRequest();
  }, [isClub]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (file.type !== 'application/pdf') {
      setError('Sono ammessi solo file PDF.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (max 10MB).');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/club/verification/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Errore durante il caricamento del certificato.');
      }

      setRequest(json?.request ?? null);
      setSelectedFileName(file.name);
      setSuccess('Certificato caricato correttamente.');
    } catch (err: any) {
      setError(err?.message || 'Errore durante il caricamento.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    try {
      setSubmitting(true);
      const res = await fetch('/api/club/verification/submit', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Impossibile inviare la richiesta.');
      }
      setRequest(json?.request ?? null);
      setSuccess('Richiesta inviata correttamente.');
    } catch (err: any) {
      setError(err?.message || 'Errore durante l\'invio.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-panel p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="heading-h2 mb-2">Richiesta verifica</h2>
          <p className="text-sm text-neutral-600">
            Carica un PDF rilasciato dal Registro nazionale delle attività sportive dilettantistiche (max 10MB).
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-neutral-500">Caricamento stato richiesta…</div>
      ) : (
        <div className="mt-4 space-y-4">
          {request?.status === 'submitted' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Richiesta inviata, in attesa di verifica.
            </div>
          )}
          {request?.status === 'rejected' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p className="font-semibold">Richiesta rifiutata</p>
              <p className="mt-1">
                {request.rejection_reason || 'La richiesta è stata rifiutata. Puoi inviare un nuovo certificato.'}
              </p>
            </div>
          )}
          {request?.status === 'approved' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {isPaymentOk ? (
                <p>
                  Club verificato fino al{' '}
                  <span className="font-semibold">{formatDate(request.verified_until) ?? '—'}</span>.
                </p>
              ) : (
                <p>Richiesta approvata. In attesa di pagamento.</p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Certificato PDF</p>
                <p className="text-xs text-slate-500">Formato PDF · max 10MB</p>
                {fileName && (
                  <p className="mt-2 text-xs text-slate-600">File: {fileName}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={!canUpload || uploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canUpload || uploading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? 'Caricamento…' : 'Carica PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Invio…' : 'Invia richiesta'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Pagamento</p>
              <p className="mt-1">Stato: {paymentLabel}</p>
              {!isPaymentOk && <p className="mt-1">Costo annuale: 12€ (MVP manuale).</p>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Ultima attività</p>
              <p className="mt-1">Richiesta: {formatDate(request?.created_at) ?? '—'}</p>
              <p className="mt-1">Aggiornamento: {formatDate(request?.updated_at) ?? '—'}</p>
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}
          {success && <div className="text-sm text-emerald-600">{success}</div>}

          {process.env.NODE_ENV !== 'production' && debug && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Debug</p>
              <p className="mt-1">userId: {debug.userId}</p>
              <p className="mt-1">profileType: {debug.profileType ?? '—'}</p>
              <p className="mt-1">clubId: {debug.clubId ?? '—'}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
