import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VerificationClient from './VerificationClient';

export const dynamic = 'force-dynamic';

export default async function ClubVerificationPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, type, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountType = String(profile?.account_type ?? profile?.type ?? '').toLowerCase();
  const status = String(profile?.status ?? '').toLowerCase();

  if (accountType !== 'club' || (status && status !== 'active')) {
    return (
      <main className="container mx-auto space-y-4 py-6">
        <header className="space-y-1">
          <h1 className="heading-h1 mb-1">Verifica profilo</h1>
        </header>
        <section className="glass-panel p-5 md:p-6">
          <p className="text-sm text-neutral-600">Accesso riservato ai club.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="heading-h1 mb-1">Verifica profilo</h1>
        <p className="text-sm text-neutral-600">
          Carica il certificato PDF del Registro nazionale delle attività sportive dilettantistiche.
        </p>
      </header>

      <VerificationClient />
    </main>
  );
}
