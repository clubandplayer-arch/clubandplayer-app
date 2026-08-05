import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getInstitutionContext } from '@/app/api/institution/verification/utils';
import InstitutionVerificationForm from './InstitutionVerificationForm';

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

export default async function InstitutionVerificationPage() {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=%2Finstitution%2Fverification');

  const ctx = await getInstitutionContext(supabase, auth.user.id).catch(() => null);
  if (!ctx) redirect('/feed');

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <button type="button" disabled className="cursor-not-allowed text-sm font-semibold text-neutral-400" title="Disponibile dopo la verifica admin">← Indietro</button>
        <Link href="/logout" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Logout</Link>
      </div>

      <header className="space-y-2">
        <h1 className="heading-h1">Verifica Ente Istituzionale</h1>
        <p className="text-sm text-neutral-600">Completa i dati dell’ente e allega una Visura oppure un Certificato P.IVA o CF rilasciato da AdE. La richiesta sarà verificata manualmente lato admin.</p>
        <p className="text-sm text-neutral-600">Finché la richiesta non viene approvata puoi usare solo questa schermata e il logout.</p>
      </header>

      <InstitutionVerificationForm />
    </main>
  );
}
