'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RequestRow = { id?: string; status?: string; document_path?: string | null } | null;

const ENTITY_TYPES = ['Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega'];
const DOCUMENT_TYPES = [
  { value: 'visura', label: 'Visura' },
  { value: 'ade_certificate', label: 'Certificato P.IVA o CF rilasciato da AdE' },
];

export default function InstitutionVerificationClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    entityName: '', fiscalCode: '', vatNumber: '', email: '', pec: '', website: '', representative: '', entityType: ENTITY_TYPES[0], documentType: DOCUMENT_TYPES[0].value,
  });
  const [file, setFile] = useState<File | null>(null);
  const [request, setRequest] = useState<RequestRow>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/institution/verification/status', { cache: 'no-store', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setRequest(json.request ?? null);
        if (json.profile) {
          setForm((curr) => ({
            ...curr,
            entityName: json.profile.full_name ?? json.profile.display_name ?? curr.entityName,
            email: json.profile.email ?? curr.email,
          }));
        }
      } else {
        setError(json?.error ?? 'Impossibile caricare lo stato della verifica.');
      }
      setLoading(false);
    })();
  }, []);

  const setField = (key: keyof typeof form, value: string) => setForm((curr) => ({ ...curr, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (!file && !request?.document_path) throw new Error('Carica un documento PDF prima di inviare.');
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('documentType', form.documentType);
        const upload = await fetch('/api/institution/verification/upload', { method: 'POST', credentials: 'include', body: fd });
        const uploadJson = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(uploadJson?.error ?? 'Upload non riuscito.');
        setRequest(uploadJson.request ?? null);
      }
      const res = await fetch('/api/institution/verification/submit', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Invio non riuscito.');
      setRequest(json.request ?? null);
      setMessage('Richiesta inviata: sarà verificata manualmente dall’amministrazione.');
    } catch (err: any) {
      setError(err?.message ?? 'Errore imprevisto.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="page-shell"><div className="rounded-xl border p-6 text-sm text-neutral-600">Caricamento…</div></main>;

  const locked = request?.status === 'submitted' || request?.status === 'approved';

  return (
    <main className="page-shell max-w-4xl space-y-6">
      <button type="button" onClick={() => router.back()} className="text-sm font-semibold text-[var(--brand)]">← Indietro</button>
      <header className="space-y-2">
        <h1 className="heading-h1">Verifica Ente Istituzionale</h1>
        <p className="text-sm text-neutral-600">Completa i dati dell’ente e allega una Visura oppure un Certificato P.IVA o CF rilasciato da AdE. La richiesta sarà verificata manualmente lato admin.</p>
      </header>
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {request?.status ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Stato richiesta: <b>{request.status}</b></div> : null}
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-sm md:grid-cols-2">
        <label className="label">Tipologia ente<select className="input" value={form.entityType} onChange={(e) => setField('entityType', e.target.value)} disabled={locked}>{ENTITY_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="label">Nome ente<input className="input" required value={form.entityName} onChange={(e) => setField('entityName', e.target.value)} disabled={locked} /></label>
        <label className="label">CF<input className="input" required value={form.fiscalCode} onChange={(e) => setField('fiscalCode', e.target.value)} disabled={locked} /></label>
        <label className="label">P.IVA<input className="input" value={form.vatNumber} onChange={(e) => setField('vatNumber', e.target.value)} disabled={locked} /></label>
        <label className="label">Email<input className="input" type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={locked} /></label>
        <label className="label">PEC<input className="input" type="email" required value={form.pec} onChange={(e) => setField('pec', e.target.value)} disabled={locked} /></label>
        <label className="label">Sito<input className="input" type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} disabled={locked} /></label>
        <label className="label">Referente<input className="input" required value={form.representative} onChange={(e) => setField('representative', e.target.value)} disabled={locked} /></label>
        <label className="label md:col-span-2">Documento<select className="input" value={form.documentType} onChange={(e) => setField('documentType', e.target.value)} disabled={locked}>{DOCUMENT_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label className="label md:col-span-2">Carica PDF<input className="input" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={locked} /></label>
        <div className="md:col-span-2"><button type="submit" disabled={saving || locked} className="btn btn-brand w-full md:w-auto">{saving ? 'Invio…' : locked ? 'Richiesta già inviata' : 'Invia verifica'}</button></div>
      </form>
    </main>
  );
}
