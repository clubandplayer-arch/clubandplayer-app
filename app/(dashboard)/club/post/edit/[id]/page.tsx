export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditForm from './EditForm';

type Opp = {
  id: string;
  owner_id: string | null;
  title: string | null;
  description: string | null;
  sport?: string | null;
  required_category?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
  created_at?: string | null;
};

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();

  const { data: ures } = await supabase.auth.getUser();
  const user = ures?.user;
  if (!user) return notFound();

  // Carico l’annuncio (se fallisce, il form farà fallback client-side fetch)
  const { data: opp } = await supabase
    .from('opportunities')
    .select(
      'id, owner_id, title, description, sport, required_category, city, province, region, country, created_at',
    )
    .eq('id', params.id)
    .maybeSingle<Opp>();

  if (!opp) {
    // Non trovato: lasciamo comunque renderizzare il form che farà fetch client-side.
    // Se preferisci 404 duro: return notFound();
  } else if (opp.owner_id !== user.id) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modifica annuncio</h1>
        <Link
          href={`/opportunities/${params.id}`}
          className="rounded-md border px-3 py-2 hover:bg-gray-50"
        >
          Apri annuncio
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-600">
        ID: <code>{params.id}</code>
      </p>

      {/* Passo SEMPRE l’id; se opp manca, il form farà fetch e mostrerà loading */}
      <EditForm id={params.id} initial={opp ?? null} />
    </div>
  );
}
