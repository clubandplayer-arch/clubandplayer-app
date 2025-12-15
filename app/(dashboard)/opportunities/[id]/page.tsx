import Link from 'next/link';
import Image from 'next/image';

import OpportunityActions from '@/components/opportunities/OpportunityActions';
import FollowButton from '@/components/common/FollowButton';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { opportunityGenderLabel } from '@/lib/opps/gender';
import { buildClubDisplayName } from '@/lib/displayName';

function formatDateHuman(date: string | null | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAge(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: authUser } = await supabase.auth.getUser();

  const { data: myProfile } = authUser?.user
    ? await supabase
        .from('profiles')
        .select('id,user_id,account_type,profile_type,type')
        .eq('user_id', authUser.user.id)
        .maybeSingle()
    : { data: null };

  const { data: opp, error } = await supabase
    .from('opportunities')
    .select(
      'id,title,description,sport,role,category,country,region,province,city,created_at,status,owner_id,created_by,club_name,club_id,required_category,age_min,age_max,gender',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !opp) {
    return (
      <div className="p-6">
        <Link href="/opportunities" className="text-blue-700 hover:underline">
          ← Torna alle opportunità
        </Link>
        <div className="mt-4 rounded-2xl border bg-red-50 p-4 text-red-700">
          Opportunità non trovata.
        </div>
      </div>
    );
  }

  const ownerId = (opp as any).owner_id ?? (opp as any).created_by ?? null;
  const clubId = (opp as any).club_id ?? ownerId ?? null;

  const { data: clubProfile } = ownerId
    ? await supabase
        .from('profiles')
        .select(
          'id,user_id,display_name,full_name,avatar_url,city,province,region,country,profile_type,account_type',
        )
        .or(`id.eq.${ownerId},user_id.eq.${ownerId}`)
        .maybeSingle()
    : { data: null };

  const clubName = buildClubDisplayName(
    clubProfile?.full_name,
    clubProfile?.display_name,
    opp.club_name ?? undefined,
  );
  const clubProfileId = clubProfile?.id ?? clubId ?? ownerId;

  const clubLocation = [clubProfile?.city, clubProfile?.province, clubProfile?.region, clubProfile?.country]
    .filter(Boolean)
    .join(', ');
  const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
  const categoryLabel = (opp as any).category ?? (opp as any).required_category ?? null;
  const genderLabel = opportunityGenderLabel((opp as any).gender) ?? undefined;
  const ageLabel = formatAge((opp as any).age_min, (opp as any).age_max);
  const published = formatDateHuman((opp as any).created_at);
  const myProfileId = myProfile?.id ?? null;
  const meUserId = authUser?.user?.id ?? null;
  const isClubUser = (() => {
    const raw = [myProfile?.account_type, (myProfile as any)?.profile_type, (myProfile as any)?.type]
      .map((v) => (v ?? '').toString().toLowerCase())
      .find((v) => v);
    return raw ? raw.includes('club') || raw.includes('soc') : false;
  })();
  const isOwner = Boolean(
    (meUserId && (meUserId === ownerId || meUserId === clubProfile?.user_id)) ||
      (myProfileId && (myProfileId === ownerId || myProfileId === clubProfile?.id)),
  );
  const showApply = !!authUser?.user && !isOwner && !isClubUser;
  const allClubOpportunitiesHref = !isOwner && clubProfileId ? `/opportunities?clubId=${clubProfileId}` : null;

  return (
    <div className="page-shell space-y-4">
      <Link href="/opportunities" className="text-sm text-blue-700 hover:underline">
        ← Torna alla lista
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <section className="space-y-4">
          <header className="rounded-2xl border bg-white/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                  {opp.status && <span className="rounded-full border px-2 py-1">{opp.status}</span>}
                  <span>Pubblicata il {published}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">{opp.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  {opp.sport && <span className="rounded-full bg-gray-100 px-3 py-1">{opp.sport}</span>}
                  {opp.role && <span className="rounded-full bg-gray-100 px-3 py-1">{opp.role}</span>}
                  <span className="rounded-full bg-gray-100 px-3 py-1">Età: {ageLabel}</span>
                  {genderLabel && <span className="rounded-full bg-gray-100 px-3 py-1">{genderLabel}</span>}
                  {place && <span className="rounded-full bg-gray-100 px-3 py-1">📍 {place}</span>}
                </div>
              </div>

              <OpportunityActions
                opportunityId={opp.id}
                clubProfileId={clubProfileId ?? null}
                showApply={showApply}
                isOwner={isOwner}
              />
            </div>
          </header>

          <section className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Descrizione</h2>
            <p className="whitespace-pre-wrap text-gray-800">{opp.description || 'Nessuna descrizione fornita.'}</p>
          </section>

          <section className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h3 className="text-lg font-semibold">Requisiti e preferenze</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
              <li>Sport e ruolo richiesti: {opp.sport || '—'} • {opp.role || '—'}</li>
              <li>Età target: {ageLabel}</li>
              <li>{place ? `Località: ${place}` : 'Località non specificata'}</li>
              <li>Categoria richiesta: {categoryLabel ?? '—'}{genderLabel ? ` • ${genderLabel}` : ''}</li>
            </ul>
          </section>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h3 className="text-lg font-semibold">Club</h3>
            <div className="flex items-center gap-3">
              {clubProfile?.avatar_url ? (
                <Image
                  src={clubProfile.avatar_url}
                  alt={clubName ?? 'Club'}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-gray-100 text-lg font-semibold">
                  {(clubName || 'C')[0]}
                </div>
              )}
              <div className="min-w-0">
                <Link href={clubProfileId ? `/clubs/${clubProfileId}` : '#'} className="font-semibold hover:underline">
                  {clubName ?? 'Club'}
                </Link>
                <p className="text-sm text-gray-600">{clubLocation || 'Località n/d'}</p>
              </div>
            </div>

            {isOwner && (
              <p className="text-sm text-gray-600">Questa è una tua opportunità.</p>
            )}

            {clubProfileId && !isOwner && (
              <FollowButton
                targetProfileId={clubProfileId}
                size="md"
                className="w-full justify-center"
              />
            )}

            {clubProfileId && !isOwner && (
              <Link
                href={`/clubs/${clubProfileId}`}
                className="block rounded-xl border px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Visita profilo
              </Link>
            )}

            {allClubOpportunitiesHref && (
              <Link
                href={allClubOpportunitiesHref}
                className="block rounded-xl border border-dashed px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Vedi tutte le opportunità di questo club
              </Link>
            )}
          </div>

          <div className="rounded-2xl border bg-white/80 p-4 shadow-sm text-sm text-gray-700 space-y-2">
            <h4 className="text-base font-semibold">Dettagli annuncio</h4>
            <p><span className="font-medium">Stato:</span> {opp.status ?? '—'}</p>
            <p><span className="font-medium">Pubblicata:</span> {published}</p>
            <p><span className="font-medium">ID:</span> {opp.id}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
