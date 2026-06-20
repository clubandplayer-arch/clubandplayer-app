import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getInstitutionContext } from '@/app/api/institution/verification/utils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const ENTITY_TYPES = ['Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega'];
const DOCUMENT_TYPES = [
  { value: 'visura', label: 'Visura' },
  { value: 'ade_certificate', label: 'Certificato P.IVA o CF rilasciato da AdE' },
];

function RequiredMark() {
  return <span className="ml-1 text-red-600" aria-label="obbligatorio">*</span>;
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none ring-[var(--brand)] focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-500';
}

export default async function InstitutionVerificationPage({ searchParams }: PageProps) {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=%2Finstitution%2Fverification');

  const ctx = await getInstitutionContext(supabase, auth.user.id).catch(() => null);
  if (!ctx) redirect('/feed');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,display_name')
    .eq('id', ctx.profileId)
    .maybeSingle();

  const { data: request } = await supabase
    .from('institution_verification_requests')
    .select('*')
    .eq('institution_id', ctx.profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const params = (await searchParams) ?? {};
  const sent = params.sent === '1';
  const locked = request?.status === 'submitted' || request?.status === 'approved';
  const initialName = request?.entity_name ?? profile?.full_name ?? profile?.display_name ?? '';

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <button type="button" disabled className="cursor-not-allowed text-sm font-semibold text-neutral-400" title="Disponibile dopo la verifica admin">← Indietro</button>
        <Link href="/logout" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Logout</Link>
      </div>

      <header className="space-y-2">
        <h1 className="heading-h1">Verifica Ente Istituzionale</h1>
        <p className="text-sm text-neutral-600">Completa i dati dell’ente e allega una Visura oppure un Certificato P.IVA o CF rilasciato da AdE. La richiesta sarà verificata manualmente lato admin.</p>
      </header>

      {sent ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Richiesta inviata: sarà verificata manualmente dall’amministrazione.</div> : null}
      {params.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{String(params.error)}</div> : null}
      {request?.status ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Stato richiesta: <b>{request.status}</b></div> : null}

      <form action="/institution/verification/submit" method="post" encType="multipart/form-data" className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-sm md:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-700">Tipologia ente<RequiredMark />
          <select name="entityType" required defaultValue={request?.entity_type ?? ENTITY_TYPES[0]} disabled={locked} className={fieldClass()}>{ENTITY_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="block text-sm font-medium text-neutral-700">Nome ente<RequiredMark />
          <input name="entityName" required defaultValue={initialName} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">CF<RequiredMark />
          <input name="fiscalCode" required defaultValue={request?.fiscal_code ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">P.IVA<RequiredMark />
          <input name="vatNumber" required defaultValue={request?.vat_number ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Email<RequiredMark />
          <input name="email" type="email" required defaultValue={request?.email ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">PEC<RequiredMark />
          <input name="pec" type="email" required defaultValue={request?.pec ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Sito<RequiredMark />
          <input name="website" type="text" inputMode="url" required defaultValue={request?.website ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700">Referente<RequiredMark />
          <input name="representative" required defaultValue={request?.representative ?? ''} disabled={locked} className={fieldClass()} />
        </label>
        <label className="block text-sm font-medium text-neutral-700 md:col-span-2">Documento<RequiredMark />
          <select name="documentType" required defaultValue={request?.document_type ?? DOCUMENT_TYPES[0].value} disabled={locked} className={fieldClass()}>{DOCUMENT_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </label>
        <label className="block text-sm font-medium text-neutral-700 md:col-span-2">Carica PDF<RequiredMark />
          <input name="file" type="file" required={!request?.document_path} accept="application/pdf" disabled={locked} className={fieldClass()} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={locked} className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{locked ? 'Richiesta già inviata' : 'Invia verifica'}</button>
        </div>
      </form>
    </main>
  );
}
