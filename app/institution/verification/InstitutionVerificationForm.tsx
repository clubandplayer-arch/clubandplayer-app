'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type VerificationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
type DocumentType = 'visura' | 'ade_certificate';

type InstitutionVerificationRequest = {
  id: string;
  status: VerificationStatus;
  entity_type: string | null;
  entity_name: string | null;
  fiscal_code: string | null;
  vat_number: string | null;
  email: string | null;
  pec: string | null;
  website: string | null;
  representative: string | null;
  document_type: string | null;
  document_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  verified_until: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileMe = {
  account_type?: string | null;
  type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
};

type FormState = {
  entityType: string;
  entityName: string;
  fiscalCode: string;
  vatNumber: string;
  email: string;
  pec: string;
  website: string;
  representative: string;
  documentType: DocumentType;
};

const ENTITY_TYPES = ['Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega'];
const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: 'visura', label: 'Visura' },
  { value: 'ade_certificate', label: 'Certificato P.IVA o CF rilasciato da AdE' },
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const emptyForm: FormState = {
  entityType: ENTITY_TYPES[0],
  entityName: '',
  fiscalCode: '',
  vatNumber: '',
  email: '',
  pec: '',
  website: '',
  representative: '',
  documentType: 'visura',
};

function normalizeWebsite(value: string) {
  const text = value.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^www\./i.test(text)) return `https://${text}`;
  return text;
}

function statusLabel(status?: string | null) {
  if (status === 'draft') return 'Bozza';
  if (status === 'submitted') return 'In valutazione';
  if (status === 'approved') return 'Approvata';
  if (status === 'rejected') return 'Rifiutata';
  return 'Bozza';
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none ring-[var(--brand)] focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-500';
}

function RequiredMark() {
  return <span className="ml-1 text-red-600" aria-label="obbligatorio">*</span>;
}

function formFromRequest(request: InstitutionVerificationRequest | null, profile?: ProfileMe | null): FormState {
  return {
    entityType: request?.entity_type || ENTITY_TYPES[0],
    entityName: request?.entity_name || profile?.full_name || profile?.display_name || '',
    fiscalCode: request?.fiscal_code || '',
    vatNumber: request?.vat_number || '',
    email: request?.email || '',
    pec: request?.pec || '',
    website: request?.website || '',
    representative: request?.representative || '',
    documentType: request?.document_type === 'ade_certificate' ? 'ade_certificate' : 'visura',
  };
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Operazione non riuscita');
  return json;
}

export default function InstitutionVerificationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<InstitutionVerificationRequest | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = request?.status === 'submitted' || request?.status === 'approved';
  const hasDocument = Boolean(request?.document_path);
  const canSubmit = useMemo(() => {
    return !busy && !locked && hasDocument && form.entityType.trim() && form.entityName.trim() && form.fiscalCode.trim() && form.vatNumber.trim() && form.email.trim() && form.pec.trim() && form.website.trim() && form.representative.trim();
  }, [busy, locked, hasDocument, form]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const profileJson = await readJson(await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' }));
        const loadedProfile = (profileJson?.data || profileJson?.profile || profileJson) as ProfileMe | null;
        const accountType = String(loadedProfile?.account_type || loadedProfile?.type || '').toLowerCase();
        if (accountType !== 'institution') throw new Error('Operazione disponibile solo per il ruolo Ente Istituzionale');
        const statusJson = await readJson(await fetch('/api/institution/verification/status', { credentials: 'include', cache: 'no-store' }));
        if (cancelled) return;
        const loadedRequest = (statusJson?.request || null) as InstitutionVerificationRequest | null;
        setRequest(loadedRequest);
        setForm(formFromRequest(loadedRequest, loadedProfile));
        setFileName(loadedRequest?.document_path ? 'PDF già caricato' : '');
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Errore imprevisto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setError(null);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Sono ammessi solo file PDF');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File troppo grande (max 10MB)');
      event.target.value = '';
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('documentType', form.documentType);
      const json = await readJson(await fetch('/api/institution/verification/upload', { method: 'POST', credentials: 'include', body }));
      const nextRequest = (json?.request || null) as InstitutionVerificationRequest | null;
      setRequest(nextRequest);
      setForm((current) => ({
        ...current,
        documentType: nextRequest?.document_type === 'ade_certificate' ? 'ade_certificate' : current.documentType,
      }));
      setFileName(file.name);
      setMessage('PDF caricato correttamente.');
    } catch (e: any) {
      setError(e?.message || 'Upload non riuscito');
      event.target.value = '';
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const json = await readJson(await fetch('/api/institution/verification/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, website: normalizeWebsite(form.website) }),
      }));
      setRequest((json?.request || null) as InstitutionVerificationRequest | null);
      setMessage('Richiesta inviata: sarà verificata manualmente dall’amministrazione.');
      router.replace('/feed');
    } catch (e: any) {
      setError(e?.message || 'Invio non riuscito');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="rounded-xl border bg-white/80 p-5 text-sm text-neutral-600">Caricamento verifica…</div>;

  return (
    <>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
      {request?.status ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Stato richiesta: <b>{statusLabel(request.status)}</b></div> : null}
      {request?.status === 'rejected' && request.rejection_reason ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Motivo rifiuto: {request.rejection_reason}</div> : null}

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-sm md:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-700">Tipologia ente<RequiredMark />
          <select value={form.entityType} onChange={(e) => setField('entityType', e.target.value)} required disabled={locked || busy} className={fieldClass()}>{ENTITY_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">Nome ente<RequiredMark />
          <input value={form.entityName} onChange={(e) => setField('entityName', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">CF<RequiredMark />
          <input value={form.fiscalCode} onChange={(e) => setField('fiscalCode', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">P.IVA<RequiredMark />
          <input value={form.vatNumber} onChange={(e) => setField('vatNumber', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Email<RequiredMark />
          <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">PEC<RequiredMark />
          <input type="email" value={form.pec} onChange={(e) => setField('pec', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Sito<RequiredMark />
          <input type="text" inputMode="url" value={form.website} onChange={(e) => setField('website', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Referente<RequiredMark />
          <input value={form.representative} onChange={(e) => setField('representative', e.target.value)} required disabled={locked || busy} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700 md:col-span-2">Documento<RequiredMark />
          <select value={form.documentType} onChange={(e) => setField('documentType', e.target.value as DocumentType)} required disabled={locked || busy} className={fieldClass()}>{DOCUMENT_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </label>
        <label className="block text-sm font-medium text-neutral-700 md:col-span-2">Carica PDF<RequiredMark />
          <input type="file" accept="application/pdf,.pdf" onChange={uploadPdf} disabled={locked || busy} className={fieldClass()} />
          {fileName ? <span className="mt-1 block text-xs text-neutral-500">{fileName}</span> : null}
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {locked ? 'Richiesta già inviata' : busy ? 'Invio…' : 'Invia richiesta'}
          </button>
        </div>
      </form>
    </>
  );
}
