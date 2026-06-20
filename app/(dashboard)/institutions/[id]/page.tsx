import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = { params: Promise<{ id: string }> };

export default async function InstitutionProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,display_name,city,province,region,country,bio,headline,avatar_url,role,account_type,type')
    .eq('id', id)
    .maybeSingle();

  const accountType = String(data?.account_type ?? data?.type ?? '').toLowerCase();
  if (!data || accountType !== 'institution') notFound();

  const name = data.display_name || data.full_name || 'Ente';
  const location = [data.city, data.province, data.region, data.country].filter(Boolean).join(' · ');

  return (
    <main className="page-shell max-w-4xl space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {data.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatar_url} alt={name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand)]/10 text-2xl font-bold text-[var(--brand)]">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-700">ENTE</span>
            <h1 className="heading-h1 mt-2">{name}</h1>
            {data.headline ? <p className="text-sm text-neutral-700">{data.headline}</p> : null}
            {location ? <p className="text-sm text-neutral-500">{location}</p> : null}
          </div>
        </div>
        {data.bio ? <p className="mt-6 whitespace-pre-line text-sm leading-6 text-neutral-700">{data.bio}</p> : null}
      </section>
    </main>
  );
}
