// app/opportunities/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function OpportunityDetail({
  params,
}: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id,title,description,city,province,region,country,created_at,owner_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!opp) return notFound();

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">{opp.title}</h1>
      <p className="text-sm text-gray-600 mb-4">
        {[opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ')}
      </p>

      <div className="prose max-w-none whitespace-pre-wrap mb-6">
        {opp.description ?? '—'}
      </div>

      <div className="flex gap-2">
        <Link
          href={`/opportunities/${opp.id}/applications`}
          className="px-3 py-2 rounded-md border hover:bg-gray-50"
        >
          Vedi candidature
        </Link>
        <Link
          href="/opportunities"
          className="px-3 py-2 rounded-md border hover:bg-gray-50"
        >
          Torna agli annunci
        </Link>
      </div>
    </div>
  );
}
